import crypto from 'crypto';
import { pool, type Db, type Queryable } from '../db';
import type { Handler, Req, Res } from '../http';

class ApiError extends Error {
  status: number; details?: any;
  constructor(status: number, message: string, details?: any) { super(message); this.status = status; this.details = details; }
}
const camelKey = (k) => k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
function toCamel(v) {
  if (Array.isArray(v)) return v.map(toCamel);
  if (v && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [camelKey(k), toCamel(x)]));
  }
  return v;
}
const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const newId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
const today = () => new Date().toISOString().slice(0, 10);
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function addMonths(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z'); const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); return d.toISOString().slice(0, 10);
}

/**
 * Wraps a route handler in ONE database transaction.
 *  - default: tenant pool, sets app.current_org (RLS) from req.user.orgId
 *  - { pool: customPool, scoped: false }: no tenant scoping (auth routes)
 * res.json/res.send are deferred until after COMMIT, so a client can never observe
 * a response for work that later rolled back (and can always read its own writes).
 */
const LABELS: [string, RegExp, string][] = [
  ['POST', /^\/invoices$/, 'Created an invoice'], ['PATCH', /^\/invoices\/[^/]+$/, 'Edited an invoice'], ['POST', /^\/invoices\/[^/]+\/send$/, 'Sent an invoice (posted to ledger)'], ['POST', /^\/invoices\/[^/]+\/void$/, 'Voided an invoice'],
  ['POST', /^\/invoices\/[^/]+\/credit-notes$/, 'Issued a credit note'], ['POST', /^\/credit-notes\/[^/]+\/void$/, 'Voided a credit note'], ['POST', /^\/invoices\/[^/]+\/(email)$/, 'Emailed an invoice'],
  ['POST', /^\/bills$/, 'Created a bill'], ['POST', /^\/bills\/[^/]+\/approve$/, 'Approved a bill (posted to ledger)'], ['POST', /^\/bills\/[^/]+\/void$/, 'Voided a bill'],
  ['POST', /^\/quotes$/, 'Created a quote'], ['POST', /^\/quotes\/[^/]+\/(send|accept|decline|convert)$/, 'Updated a quote'],
  ['POST', /^\/payments\/(invoice|bill)$/, 'Recorded a payment'], ['POST', /^\/payments\/[^/]+\/reverse$/, 'Reversed a payment'],
  ['POST', /^\/contacts$/, 'Added a contact'], ['PATCH', /^\/contacts\/[^/]+$/, 'Edited a contact'], ['DELETE', /^\/contacts\/[^/]+$/, 'Deleted a contact'],
  ['POST', /^\/accounts$/, 'Added an account'], ['PATCH', /^\/accounts\/[^/]+$/, 'Edited an account'], ['DELETE', /^\/accounts\/[^/]+$/, 'Deleted an account'],
  ['POST', /^\/bank-accounts$/, 'Added a bank account'], ['POST', /^\/bank-accounts\/[^/]+\/transactions$/, 'Added a bank transaction'], ['POST', /^\/bank-accounts\/[^/]+\/transactions\/[^/]+\/reconcile$/, 'Reconciled a bank transaction'],
  ['POST', /^\/bank-accounts\/[^/]+\/transactions\/[^/]+\/categorise$/, 'Posted a bank transaction to an account'], ['POST', /^\/bank-accounts\/[^/]+\/apply-rules$/, 'Applied bank rules'], ['POST', /^\/bank-rules$/, 'Created a bank rule'], ['DELETE', /^\/bank-rules\/[^/]+$/, 'Deleted a bank rule'],
  ['POST', /^\/vat-periods\/finalize$/, 'Finalised a VAT period'], ['POST', /^\/month-end\/[^/]+\/close$/, 'Closed a month'], ['PUT', /^\/period-lock$/, 'Changed the period lock'], ['POST', /^\/financial-years\/[^/]+\/close$/, 'Closed a financial year'],
  ['PATCH', /^\/organization$/, 'Changed company settings'], ['POST', /^\/import\/expenses\/commit$/, 'Imported expenses'],
  ['POST', /^\/notes$/, 'Added a note'], ['PATCH', /^\/notes\/[^/]+$/, 'Edited a note'], ['DELETE', /^\/notes\/[^/]+$/, 'Deleted a note'],
  ['POST', /^\/items$/, 'Added a product'], ['PATCH', /^\/items\/[^/]+$/, 'Edited a product'], ['POST', /^\/items\/[^/]+\/adjust$/, 'Adjusted stock on hand'],
  ['POST', /^\/purchase-orders$/, 'Created a purchase order'], ['POST', /^\/purchase-orders\/[^/]+\/(send|cancel|email)$/, 'Updated a purchase order'], ['POST', /^\/purchase-orders\/[^/]+\/convert$/, 'Turned a purchase order into a bill'],
  ['POST', /^\/projects$/, 'Added a project'], ['PATCH', /^\/projects\/[^/]+$/, 'Edited a project'], ['POST', /^\/projects\/[^/]+\/time$/, 'Logged time'], ['DELETE', /^\/projects\/[^/]+\/time\/[^/]+$/, 'Deleted a time entry'], ['POST', /^\/projects\/[^/]+\/invoice-time$/, 'Invoiced project time'],
  ['POST', /^\/recurring-invoices(\/run-due)?$/, 'Recurring invoices'], ['POST', /^\/recurring-invoices\/[^/]+\/(pause|resume)$/, 'Paused or resumed a recurring invoice'],
];
async function logActivity(client, req, res) {
  if (!req.user || ['GET', 'HEAD', 'OPTIONS'].includes(req.method) || res.statusCode >= 400) return;
  const path = req.path; const hit = LABELS.find(([m, re]) => m === req.method && re.test(path)); if (!hit && /^\/(auth|onboarding|companies)/.test(path)) return;
  try {
    await client.query('SAVEPOINT act');
    const u = (await client.query('SELECT name FROM users WHERE id=$1', [req.user.userId])).rows[0];
    await client.query('INSERT INTO activity_log (organization_id, user_id, user_name, action, method, path) VALUES ($1,$2,$3,$4,$5,$6)', [req.user.orgId, req.user.userId, u?.name || 'User', hit ? hit[2] : `${req.method} ${path}`, req.method, path.slice(0, 200)]);
    await client.query('RELEASE SAVEPOINT act');
  } catch { await client.query('ROLLBACK TO SAVEPOINT act').catch(() => {}); }
}
/**
 * Wraps a route handler in ONE database transaction.
 *  - default: tenant database role, row-level security pinned to req.user.orgId
 *  - { pool: other, scoped: false }: no tenant scoping (sign-in, billing, team)
 * The response is only returned after the transaction commits. If it rolls back, whatever the handler wrote is discarded,
 * so a client never sees a response for work that did not happen.
 */
function asyncHandler(fn: (req: Req, res: Res, c: Queryable) => any, options: { pool?: Db; scoped?: boolean } = {}): Handler {
  const usePool = options.pool || pool; const scoped = options.scoped !== false;
  return async (req, res, next) => {
    try {
      if (scoped && !req.user?.orgId) throw new ApiError(401, 'Not authenticated');
      await usePool.tx(async (client) => { await fn(req, res, client); if (scoped) await logActivity(client, req, res); }, scoped ? req.user.orgId : undefined);
    } catch (err) { res.reset(); next(err); }
  };
}
export { ApiError, toCamel, money, newId, today, isDate, addDays, addMonths, asyncHandler };
