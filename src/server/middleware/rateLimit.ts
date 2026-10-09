import { ApiError } from '../utils/helpers';
import type { Handler } from '../http';
/**
 * Small in-memory limiter: at most `limit` hits per `windowMs` per client IP.
 * It counts per server instance. On serverless hosting each instance counts separately, so treat it as a speed bump
 * and put a shared limiter (for example Upstash) in front for real protection.
 */
export function rateLimit({ limit = 20, windowMs = 60_000, name = 'rl' } = {}): Handler {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === '1') return next();
    const now = Date.now(); if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    const k = `${name}:${req.ip}`; let v = hits.get(k); if (!v || v.reset < now) { v = { n: 0, reset: now + windowMs }; hits.set(k, v); }
    if (++v.n > limit) return next(new ApiError(429, 'Too many attempts. Please wait a minute and try again.'));
    next();
  };
}
