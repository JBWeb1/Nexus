import { verifyToken } from '../utils/auth';
import { authPool } from '../db';
import { entitlement, coverage } from '../services/subscriptionService';
import { ApiError } from '../utils/helpers';
import type { Handler } from '../http';
import { auth } from '@/auth';

/** Who is calling: an Auth.js session cookie (the web app) or a Bearer token (scripts, tests, integrations). */
async function identify(headers: Record<string, string>): Promise<{ userId: string; orgId: string; role?: string; issuedAt?: number } | null> {
  const h = headers.authorization || '';
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
    const { issuedAt, ...user } = who; req.user = user;
    // Access is re-checked against current memberships, so removing someone or changing a role takes effect immediately.
    const m = (await authPool.query('SELECT m.role, o.plan, o.subscription_status, o.trial_ends_at, o.current_period_end, u.password_changed_at FROM memberships m JOIN organizations o ON o.id=m.organization_id JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.organization_id=$2', [who.userId, who.orgId])).rows[0];
    if (!m) return next(new ApiError(401, 'You no longer have access to this company'));
    // A password reset signs out every session and token issued before it.
    if (m.password_changed_at && !(issuedAt >= Math.floor(new Date(m.password_changed_at).getTime() / 1000))) return next(new ApiError(401, 'Your password was changed. Please sign in again.'));
    req.user.role = m.role; req.subscription = entitlement(m);
    if (!req.subscription.entitled || m.subscription_status === 'TRIALING') { const cov = await coverage(authPool, who.orgId); if (cov) req.subscription = entitlement(m, new Date(), cov); }
    const reading = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    // Without an active plan the books stay readable and exportable, but nothing can be added or changed.
    if (!req.subscription.entitled && !reading && !/^\/api\/(billing|auth|companies|team)/.test(req.originalUrl)) return next(new ApiError(402, 'Your free trial has ended. Subscribe from R' + req.subscription.price + ' a month to keep adding and changing entries. You can still view and export everything.'));
    if (m.role === 'VIEWER' && !reading && !/^\/api\/companies/.test(req.originalUrl)) return next(new ApiError(403, 'Read-only role'));
    next();
  } catch (e) { next(e); }
};
export const requireRole = (...roles: string[]): Handler => (req, res, next) => (roles.includes(req.user?.role) ? next() : next(new ApiError(403, 'Insufficient permissions')));
