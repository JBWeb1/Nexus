/**
 * Applies prisma/migrations in order using a plain PostgreSQL connection (DIRECT_URL).
 * Same result as `prisma migrate deploy`, and it records each migration in Prisma's own table with the same checksum,
 * so you can switch between the two. Use this where the Prisma CLI cannot download its engine.
 */
import { Client } from 'pg'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
(async () => {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL; if (!url) throw new Error('Set DIRECT_URL to an owner/admin connection string');
  const c = new Client({ connectionString: url }); await c.connect();
  await c.query(`CREATE TABLE IF NOT EXISTS _prisma_migrations (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0)`);
  const dir = path.join(__dirname, '..', 'prisma', 'migrations');
  for (const name of fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'migration.sql'))).sort()) {
    if ((await c.query('SELECT 1 FROM _prisma_migrations WHERE migration_name=$1 AND finished_at IS NOT NULL', [name])).rowCount) continue;
    const sql = fs.readFileSync(path.join(dir, name, 'migration.sql'), 'utf8');
    await c.query('BEGIN');
    try { await c.query(sql); await c.query('INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ($1,$2,now(),$3,1)', [crypto.randomUUID(), crypto.createHash('sha256').update(sql).digest('hex'), name]); await c.query('COMMIT'); console.log('applied', name); }
    catch (e) { await c.query('ROLLBACK'); throw e; }
  }
  await c.end(); console.log('database is up to date');
})().catch((e) => { console.error(e.message); process.exit(1); });
