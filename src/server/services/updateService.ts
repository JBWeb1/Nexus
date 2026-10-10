/**
 * Knows which version is running and whether a newer one is out. The release feed defaults to this project's GitHub
 * releases; UPDATE_CHECK_URL points it elsewhere, UPDATE_CHECK_TOKEN reads a private repository, UPDATE_CHECK=off stops it.
 */
import type { Queryable } from '../db';

export const DEFAULT_FEED = 'https://api.github.com/repos/JBWeb1/Nexus/releases/latest';
const HOURS = 3_600_000;

export function currentBuild() {
  return { version: process.env.NEXUS_VERSION || '0.0.0', commit: process.env.NEXUS_COMMIT || '', builtAt: process.env.NEXUS_BUILT_AT || null,
    hosting: process.env.VERCEL ? 'vercel' : 'self-hosted' as 'vercel' | 'self-hosted' };
}

/** Compares "2.10.0" with "v2.9.1": negative when a < b. Pre-release tags ("2.1.0-beta") sort before the release. */
export function compareVersions(a: string, b: string) {
  const parse = (v: string) => { const [core, pre] = String(v || '').trim().replace(/^v/i, '').split('-', 2); return { nums: core.split('.').map((n) => parseInt(n, 10) || 0), pre: pre ?? null }; };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) { const d = (x.nums[i] || 0) - (y.nums[i] || 0); if (d) return d; }
  if (x.pre === y.pre) return 0; if (x.pre === null) return 1; if (y.pre === null) return -1; return x.pre < y.pre ? -1 : 1;
}

export type Release = { version: string; name: string; notes: string; url: string; publishedAt: string | null };
let cache: { at: number; ttl: number; release: Release | null; error: string | null } | null = null;

/** The newest published release, cached for 6 hours (30 minutes after a failure). Never throws. */
export async function latestRelease(fetcher: typeof fetch = fetch): Promise<{ release: Release | null; error: string | null }> {
  if (process.env.UPDATE_CHECK === 'off') return { release: null, error: 'Update checks are turned off (UPDATE_CHECK=off)' };
  if (cache && Date.now() - cache.at < cache.ttl) return { release: cache.release, error: cache.error };
  const url = process.env.UPDATE_CHECK_URL || DEFAULT_FEED;
  try {
    const res = await fetcher(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'nexus-ledger-update-check', ...(process.env.UPDATE_CHECK_TOKEN ? { Authorization: `Bearer ${process.env.UPDATE_CHECK_TOKEN}` } : {}) }, signal: AbortSignal.timeout(5000) });
    if (res.status === 404) throw new Error('No releases published yet (or the repository is private: set UPDATE_CHECK_TOKEN)');
    if (!res.ok) throw new Error(`Release feed answered ${res.status}`);
    const j: any = await res.json();
    const release = { version: String(j.tag_name || '').replace(/^v/i, ''), name: j.name || j.tag_name || '', notes: String(j.body || '').slice(0, 4000), url: j.html_url || '', publishedAt: j.published_at || null };
    if (!release.version) throw new Error('Release feed gave no version');
    cache = { at: Date.now(), ttl: 6 * HOURS, release, error: null };
  } catch (e: any) { cache = { at: Date.now(), ttl: HOURS / 2, release: null, error: e.name === 'TimeoutError' ? 'Release feed did not answer in time' : e.message }; }
  return { release: cache.release, error: cache.error };
}
export const clearReleaseCache = () => { cache = null; };

/** Migrations this build expects vs. those the database has applied. */
export async function databaseStatus(c: Queryable) {
  const expected = (process.env.NEXUS_MIGRATIONS || '').split(',').filter(Boolean);
  let applied: string[] = [];
  try { applied = (await c.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name')).rows.map((r) => r.migration_name); }
  catch { return { known: false, pending: [], unknown: [], latest: null }; }
  return { known: true, pending: expected.filter((m) => !applied.includes(m)), unknown: applied.filter((m) => expected.length && !expected.includes(m)), latest: applied[applied.length - 1] || null };
}

export async function updateStatus(c: Queryable, fetcher?: typeof fetch) {
  const current = currentBuild(); const { release, error } = await latestRelease(fetcher); const database = await databaseStatus(c);
  return { current, latest: release, checkError: error, updateAvailable: !!release && compareVersions(release.version, current.version) > 0, database,
    howToUpdate: current.hosting === 'vercel'
      ? 'Merge the new version into the branch Vercel deploys. Vercel rebuilds the app and the build updates the database before the new version goes live.'
      : 'On the server run "npm run update". It backs up the database, installs the new version, updates the database, restarts the app and rolls back if the new version does not start.' };
}
