/** Creates the database named in DIRECT_URL if it does not exist yet, so no psql command is needed. */
import { Client } from 'pg';
(async () => {
  const url = process.env.DIRECT_URL; if (!url) throw new Error('Set DIRECT_URL in .env first (copy .env.example to .env)');
  const u = new URL(url); const name = decodeURIComponent(u.pathname.slice(1)); if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error('Database name may only contain letters, numbers and underscores');
  u.pathname = '/postgres'; const c = new Client({ connectionString: u.toString() });
  try { await c.connect(); } catch (e: any) { throw new Error(`Could not connect to PostgreSQL: ${e.message}. Is PostgreSQL running, and is the password in DIRECT_URL right?`); }
  const exists = (await c.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount;
  if (exists) console.log(`database "${name}" already exists`); else { await c.query(`CREATE DATABASE "${name}"`); console.log(`created database "${name}"`); }
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
