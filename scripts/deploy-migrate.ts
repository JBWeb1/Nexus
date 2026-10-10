/**
 * Runs as part of `npm run build`, so every deploy (Vercel, or `npm run update` on your own server) brings the database
 * up to date before the new code goes live. Without DIRECT_URL (for example a build with no database) it skips, and
 * SKIP_MIGRATIONS=1 turns it off.
 */
import { runMigrations } from './migrate';
(async () => {
  // Locally the connection strings live in .env; on Vercel they are already in the environment.
  try { (process as any).loadEnvFile?.('.env'); } catch {}
  if (process.env.SKIP_MIGRATIONS === '1') return console.log('[deploy] SKIP_MIGRATIONS=1: database not updated');
  if (!process.env.DIRECT_URL) return console.log('[deploy] no DIRECT_URL: skipping database update (set it to update the database on deploy)');
  const applied = await runMigrations(process.env.DIRECT_URL);
  console.log(applied.length ? `[deploy] database updated: ${applied.join(', ')}` : '[deploy] database already up to date');
})().catch((e) => { console.error('[deploy] database update failed, so the build stops here and the live site keeps running the old version:', e.message); process.exit(1); });
