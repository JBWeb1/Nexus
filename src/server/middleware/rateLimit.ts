import { ApiError } from '../utils/helpers';
import type { Handler } from '../http';
/**
 * Small in-memory limiter: at most `limit` hits per `windowMs` per client IP.
 * It counts per server instance. On serverless hosting each instance counts separately, so treat it as a speed bump
 * and put a shared limiter (for example Upstash) in front for real protection.
 */
/**
 * Failed sign-in attempts per account, so guessing a password or a two-factor code is capped even when the attacker
 * changes IP address. Same per-instance caveat as `rateLimit`.
 */
const failures = new Map<string, { n: number; reset: number }>();
const LOCK_LIMIT = 10, LOCK_MS = 15 * 60_000;
const limiterOff = () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === '1';
export const accountLock = {
  check(key: string) {
    if (limiterOff()) return; const v = failures.get(key);
    if (v && v.reset > Date.now() && v.n >= LOCK_LIMIT) throw new ApiError(429, 'Too many failed attempts for this account. Please wait 15 minutes and try again.');
  },
  fail(key: string) {
    const now = Date.now(); if (failures.size > 5000) for (const [k, v] of failures) if (v.reset < now) failures.delete(k);
    let v = failures.get(key); if (!v || v.reset < now) { v = { n: 0, reset: now + LOCK_MS }; failures.set(key, v); } v.n++;
  },
  clear(key: string) { failures.delete(key); },
};

export function rateLimit({ limit = 20, windowMs = 60_000, name = 'rl' } = {}): Handler {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req, res, next) => {
    if (limiterOff()) return next();
    const now = Date.now(); if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    const k = `${name}:${req.ip}`; let v = hits.get(k); if (!v || v.reset < now) { v = { n: 0, reset: now + windowMs }; hits.set(k, v); }
    if (++v.n > limit) return next(new ApiError(429, 'Too many attempts. Please wait a minute and try again.'));
    next();
  };
}
