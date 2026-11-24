/**
 * The installers on the public /download page. GitHub Actions publishes them to the repository's "apps" release under
 * fixed names (see .github/workflows/windows.yml and android.yml). This asks GitHub which ones exist, so the page only
 * links to files that are really there. Cached for ten minutes.
 */
import { DEFAULT_FEED } from './updateService';

export type AppFile = { kind: 'windows' | 'mac' | 'android'; url: string; sizeMb: number; updatedAt: string };
const NAMES: Record<string, AppFile['kind']> = { 'Nexus-Ledger-Setup.exe': 'windows', 'Nexus-Ledger-Mac.dmg': 'mac', 'Nexus-Ledger.apk': 'android' };
/** owner/repo: APP_DOWNLOADS_REPO, else the repository the update check uses. */
export const downloadsRepo = () => process.env.APP_DOWNLOADS_REPO || DEFAULT_FEED.match(/repos\/([^/]+\/[^/]+)\//)![1];

let cache: { at: number; files: AppFile[] } | null = null;
export async function appFiles(fetcher: typeof fetch = fetch): Promise<AppFile[]> {
  if (process.env.APP_DOWNLOADS === 'off') return [];
  if (cache && Date.now() - cache.at < 600_000) return cache.files;
  let files: AppFile[] = [];
  try {
    const res = await fetcher(`https://api.github.com/repos/${downloadsRepo()}/releases/tags/apps`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'nexus-ledger-downloads', ...(process.env.UPDATE_CHECK_TOKEN ? { Authorization: `Bearer ${process.env.UPDATE_CHECK_TOKEN}` } : {}) },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const rel = await res.json();
      files = (rel.assets || []).filter((a: any) => NAMES[a.name] && a.state === 'uploaded')
        .map((a: any) => ({ kind: NAMES[a.name], url: a.browser_download_url, sizeMb: Math.round((a.size / 1048576) * 10) / 10, updatedAt: a.updated_at }));
    }
  } catch { /* GitHub unreachable: the page still offers installing from the browser */ }
  cache = { at: Date.now(), files }; return files;
}
export const clearAppFilesCache = () => { cache = null; };
