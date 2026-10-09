import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken';
const secret = () => process.env.JWT_SECRET || 'dev-only-change-me';
export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const comparePassword = (p: string, h: string) => bcrypt.compare(p, h);
export const signToken = (u: { id: string; organization_id: string; role: string }) => jwt.sign({ userId: u.id, orgId: u.organization_id, role: u.role }, secret(), { expiresIn: '7d' });
export const verifyToken = (t: string) => jwt.verify(t, secret()) as { userId: string; orgId: string; role: string };

// ---- Two-factor (TOTP, RFC 6238: SHA-1, 30 s steps, 6 digits) and secret encryption at rest ----
import crypto from 'crypto';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32encode = (buf) => { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return out; };
const b32decode = (s) => { let bits = ''; for (const ch of s.replace(/=+$/, '').toUpperCase()) bits += B32.indexOf(ch).toString(2).padStart(5, '0'); const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(bytes); };
const hotp = (secret, counter) => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(counter)); const h = crypto.createHmac('sha1', b32decode(secret)).update(b).digest(); const o = h[h.length - 1] & 15; return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0'); };
const key = () => crypto.createHash('sha256').update((process.env.JWT_SECRET || 'dev-only-change-me') + ':totp').digest();
export const totp = {
  newSecret: () => b32encode(crypto.randomBytes(20)),
  token: (secret, at = Date.now()) => hotp(secret, Math.floor(at / 30000)),
  verify: (secret, code, at = Date.now()) => { const c = String(code || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(c)) return false; const step = Math.floor(at / 30000); return [-1, 0, 1].some((d) => crypto.timingSafeEqual(Buffer.from(hotp(secret, step + d)), Buffer.from(c))); },
  uri: (secret, account, issuer = 'Nexus Ledger') => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`,
};
export const seal = (text) => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key(), iv); const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]); return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.'); };
export const unseal = (blob) => { const [iv, tag, enc] = blob.split('.').map((x) => Buffer.from(x, 'base64')); const d = crypto.createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag); return Buffer.concat([d.update(enc), d.final()]).toString('utf8'); };
