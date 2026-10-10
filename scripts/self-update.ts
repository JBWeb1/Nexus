/**
 * Updates a self-hosted install in place: npm run update [-- --yes] [--check] [--channel=main] [--no-backup]
 *
 *  1. finds a newer version: the highest vX.Y.Z git tag (default), or the latest commit on main with --channel=main
 *  2. backs up the database with pg_dump (DIRECT_URL) into backups/
 *  3. checks out the new version, installs dependencies and builds; the build updates the database
 *  4. restarts the app with UPDATE_RESTART_CMD (e.g. "pm2 restart nexus" or "systemctl restart nexus")
 *  5. waits for APP_URL/health to answer with the new version
 * If install, build or the health check fails, it puts the previous version back, rebuilds and restarts it.
 * Database changes are additive, so the previous version keeps working; the backup is there if you need to restore.
 *
 * For nightly updates, add to cron: 15 3 * * * cd /path/to/nexus && npm run update -- --yes >> backups/update.log 2>&1
 */
import { execSync, spawnSync } from 'child_process'; import fs from 'fs'; import path from 'path'; import readline from 'readline';
import { compareVersions } from '../src/server/services/updateService';

const args = new Set(process.argv.slice(2)); const flag = (name: string) => [...args].find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const CHANNEL = flag('channel') || process.env.UPDATE_CHANNEL || 'release';
const ROOT = path.join(__dirname, '..'); process.chdir(ROOT);
try { (process as any).loadEnvFile?.('.env'); } catch {}
const APP_URL = (process.env.UPDATE_HEALTH_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const log = (m: string) => console.log(`[update ${new Date().toISOString()}] ${m}`);
const sh = (cmd: string, quiet = false) => execSync(cmd, { stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit', encoding: 'utf8' }) as unknown as string;
const out = (cmd: string) => String(sh(cmd, true) || '').trim();
const version = () => JSON.parse(fs.readFileSync('package.json', 'utf8')).version as string;
const has = (bin: string) => spawnSync('sh', ['-c', `command -v ${bin}`]).status === 0;

async function confirm(q: string) {
  if (args.has('--yes')) return true;
  if (!process.stdin.isTTY) { log('Not running in a terminal: add --yes to update without asking.'); return false; }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a: string = await new Promise((r) => rl.question(`${q} [y/N] `, r)); rl.close(); return /^y(es)?$/i.test(a.trim());
}
async function healthy(expect: string | null, seconds = 90) {
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    try { const r = await fetch(`${APP_URL}/health`, { signal: AbortSignal.timeout(3000) }); const j: any = await r.json(); if (r.ok && j.ok && (!expect || j.version === expect)) return true; } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
function restart() {
  if (!process.env.UPDATE_RESTART_CMD) { log('UPDATE_RESTART_CMD is not set: restart the app yourself now (for example "pm2 restart nexus").'); return false; }
  log(`restarting: ${process.env.UPDATE_RESTART_CMD}`); sh(process.env.UPDATE_RESTART_CMD); return true;
}
function installAndBuild() { sh('npm ci --no-audit --no-fund'); sh('npm run build'); }

(async () => {
  if (!fs.existsSync('.git')) throw new Error('This folder is not a git checkout, so it cannot update itself. Install with "git clone".');
  if (out('git status --porcelain --untracked-files=no')) throw new Error('There are local code changes. Commit or remove them first, so the update cannot overwrite your work.');
  const current = version(), prev = out('git rev-parse HEAD');
  log(`running ${current} (${prev.slice(0, 7)}), channel: ${CHANNEL}`);
  sh('git fetch --tags --force --quiet origin');

  let target: string, targetVersion: string | null = null;
  if (CHANNEL === 'main') {
    const branch = out('git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo origin/main');
    target = out(`git rev-parse ${branch}`);
    if (target === prev || out(`git merge-base --is-ancestor ${target} HEAD && echo yes || true`) === 'yes') return log('already up to date');
    targetVersion = JSON.parse(out(`git show ${target}:package.json`)).version; log(`newer code on ${branch}: ${target.slice(0, 7)} (version ${targetVersion})`);
  } else {
    const tags = out("git tag -l 'v[0-9]*'").split('\n').filter(Boolean).sort((a, b) => compareVersions(b, a)).filter((t) => !t.includes('-'));
    if (!tags.length || compareVersions(tags[0], current) <= 0) return log(`already up to date (newest release: ${tags[0] || 'none'})`);
    target = tags[0]; targetVersion = target.replace(/^v/, ''); log(`version ${targetVersion} is available`);
  }
  if (args.has('--check')) return log('check only: nothing changed. Run "npm run update" to install it.');
  if (!(await confirm(`Update Nexus Ledger from ${current} to ${targetVersion}?`))) return log('not updated');

  // 1. Back up the database.
  let backup: string | null = null;
  if (!args.has('--no-backup')) {
    if (!process.env.DIRECT_URL) throw new Error('DIRECT_URL is not set, so the database cannot be backed up. Set it, or pass --no-backup.');
    if (!has('pg_dump')) throw new Error('pg_dump is not installed, so the database cannot be backed up. Install the PostgreSQL client tools, or pass --no-backup.');
    fs.mkdirSync('backups', { recursive: true }); backup = path.join('backups', `nexus-${current}-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
    execSync(`pg_dump --format=custom --file="${backup}" "$DIRECT_URL"`, { stdio: 'inherit' }); log(`database backed up to ${backup}`);
  }

  // 2. New code, dependencies, build (which also updates the database), restart, health check.
  const rollback = async (why: string) => {
    log(`${why}. Putting ${current} back.`);
    try { sh(`git checkout --quiet --detach ${prev}`); installAndBuild(); const restarted = restart(); if (restarted && !(await healthy(current))) log('the previous version did not answer either: check the app logs.'); else log(`back on ${current}.`); }
    catch (e: any) { log(`rollback failed: ${e.message}. Check out ${prev.slice(0, 7)} and rebuild by hand.`); }
    if (backup) log(`If the data looks wrong, restore the backup: pg_restore --clean --if-exists --dbname="$DIRECT_URL" ${backup}`);
    process.exit(1);
  };
  try { sh(`git checkout --quiet --detach ${target}`); installAndBuild(); } catch (e: any) { return rollback(`install or build failed (${e.message.split('\n')[0]})`); }
  if (restart()) { if (!(await healthy(targetVersion))) return rollback(`${APP_URL}/health did not report version ${targetVersion} within 90 seconds`); log(`updated to ${targetVersion} and the app is answering.`); }
  else log(`updated to ${targetVersion}. Restart the app to start using it.`);
})().catch((e) => { log(`stopped: ${e.message}`); process.exit(1); });
