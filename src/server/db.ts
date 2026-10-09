import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Three database identities, each a Prisma client on its own PostgreSQL role:
 *   pool        nexus_app      tenant-scoped; row-level security limits every query to one company
 *   authPool    nexus_authn    sign-in, memberships and invitations only
 *   servicePool nexus_service  billing and webhooks
 * Controllers get a `Queryable` inside a transaction. `query()` runs SQL through Prisma on that transaction, and
 * `prisma` is the typed Prisma client bound to the same transaction, so both styles share one unit of work.
 */
export type Row = Record<string, any>;
export interface QueryResult { rows: Row[]; rowCount: number }
export interface Queryable { query(sql: string, params?: any[]): Promise<QueryResult>; prisma: Prisma.TransactionClient | PrismaClient }

const DEV = (role: string) => `postgres://${role}:${role}_dev_password@localhost:5432/nexus_ledger`;
const urls = {
  app: process.env.DATABASE_URL || DEV('nexus_app'),
  authn: process.env.AUTHN_DATABASE_URL || DEV('nexus_authn'),
  service: process.env.SERVICE_DATABASE_URL || DEV('nexus_service'),
};

/** PostgreSQL error with the original SQLSTATE in `code`, so callers can react to 23505, P0001 and friends. */
export class DbError extends Error { code?: string; constructor(message: string, code?: string) { super(message); this.code = code; } }
function translate(e: any): never {
  const cause = e?.meta?.driverAdapterError?.cause;
  if (cause) throw new DbError(cause.originalMessage || cause.message || e.message, cause.originalCode || cause.code);
  throw e;
}
const isPlain = (v: any) => v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v) && !Buffer.isBuffer(v) && Object.getPrototypeOf(v) === Object.prototype;
const inParam = (v: any) => (v === undefined ? null : isPlain(v) ? JSON.stringify(v) : v);
/** Prisma hands back Decimal, BigInt and Date objects. The app works in numbers and 'YYYY-MM-DD' strings for DATE columns. */
function outValue(v: any): any {
  if (v === null || v === undefined) return v;
  if (typeof v === 'bigint') return Number(v);
  if (Prisma.Decimal.isDecimal(v)) return (v as Prisma.Decimal).toNumber();
  // DATE columns arrive as midnight UTC. Timestamps keep their time of day, so they stay Date objects.
  if (v instanceof Date) return v.getUTCHours() + v.getUTCMinutes() + v.getUTCSeconds() + v.getUTCMilliseconds() === 0 ? v.toISOString().slice(0, 10) : v;
  return v;
}
const outRow = (r: Row) => { const o: Row = {}; for (const k in r) o[k] = outValue(r[k]); return o; };
/** Turns typed Prisma results (Decimal, BigInt, DATE-as-Date) into the plain JSON shapes the API returns. */
export function plain<T>(v: T): any {
  if (Array.isArray(v)) return v.map(plain);
  if (isPlain(v)) { const o: Row = {}; for (const k in v as any) o[k] = plain((v as any)[k]); return o; }
  return outValue(v);
}
const READS = /^\s*(select|with|show|values)\b/i, RETURNS = /\breturning\b/i;

async function run(client: any, sql: string, params: any[] = []): Promise<QueryResult> {
  const args = params.map(inParam);
  try {
    if (READS.test(sql) || RETURNS.test(sql)) { const rows = ((await client.$queryRawUnsafe(sql, ...args)) as Row[]).map(outRow); return { rows, rowCount: rows.length }; }
    return { rows: [], rowCount: Number(await client.$executeRawUnsafe(sql, ...args)) };
  } catch (e) { translate(e); }
}

export class Db implements Queryable {
  constructor(public prisma: PrismaClient) {}
  query(sql: string, params?: any[]) { return run(this.prisma, sql, params); }
  /** One transaction. With `orgId`, row-level security is pinned to that company for the life of the transaction. */
  tx<T>(fn: (c: Queryable) => Promise<T>, orgId?: string): Promise<T> {
    return this.prisma.$transaction(async (t) => {
      const c: Queryable = { query: (s, p) => run(t, s, p), prisma: t };
      if (orgId) await c.query("SELECT set_config('app.current_org', $1, true)", [orgId]);
      return fn(c);
    }, { maxWait: 15_000, timeout: 60_000 });
  }
}

const make = (url: string) => new Db(new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: Number(process.env.DB_POOL_MAX || 5) }) }));
const g = globalThis as unknown as { __nexusDb?: { pool: Db; authPool: Db; servicePool: Db } };
// Reuse clients across hot reloads and warm serverless invocations.
const dbs = g.__nexusDb ?? (g.__nexusDb = { pool: make(urls.app), authPool: make(urls.authn), servicePool: make(urls.service) });
export const pool = dbs.pool, authPool = dbs.authPool, servicePool = dbs.servicePool;
