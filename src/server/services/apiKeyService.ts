/**
 * API keys: how other software (a shop, a point of sale, an accountant's tools) uses one company's books.
 * A key is "nxs_" plus 32 random characters. Only its SHA-256 hash is stored; the first 12 characters are kept in the
 * clear so people can tell their keys apart. A key acts with the access chosen when it was made (READ or WRITE), never
 * more than its creator has, and stops working when it is revoked or its creator loses access to the company.
 */
import crypto from 'crypto';
import { authPool } from '../db';
import { ApiError } from '../utils/helpers';

export const KEY_PREFIX = 'nxs_';
export const hashKey = (key: string) => crypto.createHash('sha256').update(key).digest('hex');
export const isApiKey = (token: string) => token.startsWith(KEY_PREFIX);
export function newKey() { const key = KEY_PREFIX + crypto.randomBytes(24).toString('base64url'); return { key, prefix: key.slice(0, 12), hash: hashKey(key) }; }

/** The role a key acts with: read-only keys are viewers; read-and-write keys are accountants, capped by their creator. */
export const keyRole = (access: string, creatorRole: string) => (access === 'READ' || creatorRole === 'VIEWER' ? 'VIEWER' : 'ACCOUNTANT');

/** Looks a key up by its hash. Unknown and revoked keys are refused with the same message, so keys cannot be probed. */
export async function resolveKey(key: string) {
  const k = (await authPool.query('SELECT id, organization_id, name, access, created_by, revoked_at, last_used_at FROM api_keys WHERE key_hash=$1', [hashKey(key)])).rows[0];
  if (!k || k.revoked_at) throw new ApiError(401, 'Invalid or revoked API key');
  // Recorded at most once a minute, so a busy integration does not write on every request.
  if (!k.last_used_at || Date.now() - new Date(k.last_used_at).getTime() > 60_000) await authPool.query('UPDATE api_keys SET last_used_at=now() WHERE id=$1', [k.id]).catch(() => {});
  return { id: k.id as string, orgId: k.organization_id as string, userId: k.created_by as string, name: k.name as string, access: k.access as 'READ' | 'WRITE' };
}

/** Requests per minute per key (API_RATE_LIMIT, default 300). Per server instance, like the other limiters. */
const hits = new Map<string, { n: number; reset: number }>();
export function keyRateLimit(id: string) {
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === '1') return;
  const limit = Number(process.env.API_RATE_LIMIT || 300), now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  let v = hits.get(id); if (!v || v.reset < now) { v = { n: 0, reset: now + 60_000 }; hits.set(id, v); }
  if (++v.n > limit) throw new ApiError(429, `This API key made more than ${limit} requests in a minute. Wait a moment and try again.`);
}

/** What a key may never do, whatever its access: manage people, billing, keys, sign-in or companies. */
export const KEY_BLOCKED = /^\/api\/(team|billing|api-keys|companies|auth\/(login|register|2fa|passkeys?|forgot|reset))(\/|$|\?)/;
