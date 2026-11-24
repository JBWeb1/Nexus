import { verifyToken } from '../utils/auth';
import { authPool } from '../db';
import { entitlement, coverage } from '../services/subscriptionService';
import { ApiError } from '../utils/helpers';
import type { Handler } from '../http';
import { auth } from '@/auth';
import { isApiKey, resolveKey, keyRole, keyRateLimit, KEY_BLOCKED } from '../services/apiKeyService';

type ApiKeyInfo = { id: string; name: string; access: 'READ' | 'WRITE' };
/** Who is calling: an Auth.js session cookie (the web app), an API key ("Bearer nxs_..."), or a sign-in token. */
async function identify(headers: Record<string, string>): Promise<{ userId: string; orgId: string; role?: string; issuedAt?: number; apiKey?: ApiKeyInfo } | null> {
  const h = headers.authorization || '';
  if (h.startsWith('Bearer ') && isApiKey(h.slice(7))) { const k = await resolveKey(h.slice(7).trim()); return { userId: k.userId, orgId: k.orgId, apiKey: { id: k.id, name: k.name, access: k.access } }; }
  let badToken = false;
  if (h.startsWith('Bearer ')) { try { const p = verifyToken(h.slice(7)); return { userId: p.userId, orgId: p.orgId, issuedAt: p.iat }; } catch { badToken = true; } }
  const s: any = await auth().catch(() => null);
  if (s?.userId && s?.orgId) return { userId: s.userId, orgId: s.orgId, issuedAt: s.authAt };
  if (badToken) throw new ApiError(401, 'Invalid or expired token');
  return null;
}

export const requireAuth: Handler = async (req, res, next) => {
  try {
    const who = await identify(req.headers); if (!who) return next(new ApiError(401, 'Authentication required'));
    const { issuedAt, apiKey, ...user } = who; req.user = user;
    if (apiKey) { keyRateLimit(apiKey.id); if (KEY_BLOCKED.test(req.originalUrl)) return next(new ApiError(403, 'API keys cannot manage people, billing, keys, sign-in or companies. Sign in to Nexus to do that.')); }
    // Access is re-checked against current memberships, so removing someone or changing a role takes effect immediately.
    const m = (await authPool.query('SELECT m.role, o.plan, o.subscription_status, o.trial_ends_at, o.current_period_end, u.password_changed_at FROM memberships m JOIN organizations o ON o.id=m.organization_id JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.organization_id=$2', [who.userId, who.orgId])).rows[0];
    if (!m) return next(new ApiError(401, apiKey ? 'The person who created this API key no longer has access to this company, so the key no longer works' : 'You no longer have access to this company'));
    // A password reset signs out every session and token issued before it. API keys are separate credentials and are revoked on their own.
    if (!apiKey && m.password_changed_at && !(issuedAt >= Math.floor(new Date(m.password_changed_at).getTime() / 1000))) return next(new ApiError(401, 'Your password was changed. Please sign in again.'));
    req.user.role = apiKey ? keyRole(apiKey.access, m.role) : m.role; if (apiKey) req.user.apiKey = apiKey; req.subscription = entitlement(m);
    if (!req.subscription.entitled || m.subscription_status === 'TRIALING') { const cov = await coverage(authPool, who.orgId); if (cov) req.subscription = entitlement(m, new Date(), cov); }
    const reading = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    // Without an active plan the books stay readable and exportable, but nothing can be added or changed.
    if (!req.subscription.entitled && !reading && !/^\/api\/(billing|auth|companies|team)/.test(req.originalUrl)) return next(new ApiError(402, 'Your free trial has ended. Subscribe from R' + req.subscription.price + ' a month to keep adding and changing entries. You can still view and export everything.'));
    if (req.user.role === 'VIEWER' && !reading && !/^\/api\/companies/.test(req.originalUrl)) return next(new ApiError(403, apiKey ? 'This API key is read-only' : 'Read-only role'));
    next();
  } catch (e) { next(e); }
};
export const requireRole = (...roles: string[]): Handler => (req, res, next) => (roles.includes(req.user?.role) ? next() : next(new ApiError(403, 'Insufficient permissions')));
