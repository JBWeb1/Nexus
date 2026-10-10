/**
 * Applies prisma/migrations in order using a plain PostgreSQL connection (DIRECT_URL).
 * Same result as `prisma migrate deploy`, and it records each migration in Prisma's own table with the same checksum,
 * so you can switch between the two. Use this where the Prisma CLI cannot download its engine.
 */
import { Client } from 'pg'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';

export const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
export const migrationNames = () => fs.readdirSync(migrationsDir).filter((d) => fs.existsSync(path.join(migrationsDir, d, 'migration.sql'))).sort();

/** Applies every migration not yet recorded, each in its own transaction. Returns the names applied. */
export async function runMigrations(url: string): Promise<string[]> {
  const c = new Client({ connectionString: url }); await c.connect(); const applied: string[] = [];
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS _prisma_migrations (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0)`);
    // One updater at a time: two deploys finishing together must not both apply the same migration.
    await c.query("SELECT pg_advisory_lock(hashtext('nexus_migrations'))");
    for (const name of migrationNames()) {
      if ((await c.query('SELECT 1 FROM _prisma_migrations WHERE migration_name=$1 AND finished_at IS NOT NULL', [name])).rowCount) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, name, 'migration.sql'), 'utf8');
      await c.query('BEGIN');
      try { await c.query(sql); await c.query('INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ($1,$2,now(),$3,1)', [crypto.randomUUID(), crypto.createHash('sha256').update(sql).digest('hex'), name]); await c.query('COMMIT'); console.log('applied', name); applied.push(name); }
      catch (e: any) { await c.query('ROLLBACK'); throw new Error(`Migration ${name} failed and was rolled back: ${e.message}`); }
    }
  } finally { await c.end(); }
  return applied;
}

if (require.main === module) {
  (async () => {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL; if (!url) throw new Error('Set DIRECT_URL to an owner/admin connection string');
    await runMigrations(url); console.log('database is up to date');
  })().catch((e) => { console.error(e.message); process.exit(1); });
}
