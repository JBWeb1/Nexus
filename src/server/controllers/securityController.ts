import crypto from 'crypto'; import QR from 'qrcode';
import { ApiError,newId } from '../utils/helpers';
import { hashPassword,comparePassword,totp,seal,unseal } from '../utils/auth';
import { sendMail,configured } from '../utils/mailer';
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

/** Always answers the same way, so nobody can use this form to discover which emails have accounts. */
async function forgot(req, res, c) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const u = email && (await c.query('SELECT id, name FROM users WHERE email=$1', [email])).rows[0];
  if (u) {
    const token = crypto.randomBytes(32).toString('hex');
    await c.query('INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES ($1,$2,$3, now() + interval \'1 hour\')', [newId('pr'), u.id, sha(token)]);
    const link = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    if (configured()) sendMail({ to: email, subject: 'Reset your Nexus Ledger password', text: `Hi ${u.name},\n\nUse this link within one hour to choose a new password:\n${link}\n\nIf you did not ask for this, ignore this email.` }).catch((e) => console.error('[mail]', e.message));
    // The link is a password for the account, so it is only printed in development.
    else if (process.env.NODE_ENV !== 'production') console.log(`[password reset] email is not configured; reset link for ${email}: ${link}`);
    else console.error('[password reset] email is not configured, so the reset link could not be sent');
  }
  res.json({ ok: true, message: 'If that email has an account, a reset link is on its way.' });
}
async function reset(req, res, c) {
  const { token, password } = req.body || {};
  if (!token || !password || password.length < 8) throw new ApiError(400, 'Choose a password of at least 8 characters');
  const r = (await c.query('SELECT id, user_id FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now() FOR UPDATE', [sha(String(token))])).rows[0];
  if (!r) throw new ApiError(400, 'This reset link has expired or was already used. Ask for a new one.');
  await c.query('UPDATE users SET password_hash=$2, password_changed_at=now() WHERE id=$1', [r.user_id, await hashPassword(password)]);
  await c.query('UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [r.user_id]);
  res.json({ ok: true });
}
async function twoFaSetup(req, res, c) {
  const u = (await c.query('SELECT email, totp_enabled FROM users WHERE id=$1', [req.user.userId])).rows[0];
  if (u.totp_enabled) throw new ApiError(409, 'Two-factor login is already on');
  const secret = totp.newSecret(); await c.query('UPDATE users SET totp_secret=$2 WHERE id=$1', [req.user.userId, seal(secret)]);
  const uri = totp.uri(secret, u.email); res.json({ secret, uri, qr: await QR.toDataURL(uri, { margin: 1, width: 220 }) });
}
async function twoFaEnable(req, res, c) {
  const u = (await c.query('SELECT totp_secret, totp_enabled FROM users WHERE id=$1', [req.user.userId])).rows[0];
  if (u.totp_enabled) throw new ApiError(409, 'Two-factor login is already on');
  if (!u.totp_secret) throw new ApiError(400, 'Start setup first');
  if (!totp.verify(unseal(u.totp_secret), req.body?.code)) throw new ApiError(400, 'That code is not right. Check the app and try again.');
  await c.query('UPDATE users SET totp_enabled=true WHERE id=$1', [req.user.userId]); res.json({ ok: true });
}
async function twoFaDisable(req, res, c) {
  const u = (await c.query('SELECT password_hash, totp_secret, totp_enabled FROM users WHERE id=$1', [req.user.userId])).rows[0];
  if (!u.totp_enabled) throw new ApiError(409, 'Two-factor login is not on');
  if (!(await comparePassword(String(req.body?.password || ''), u.password_hash))) throw new ApiError(401, 'Wrong password');
  if (!totp.verify(unseal(u.totp_secret), req.body?.code)) throw new ApiError(400, 'That code is not right');
  await c.query('UPDATE users SET totp_enabled=false, totp_secret=NULL WHERE id=$1', [req.user.userId]); res.json({ ok: true });
}
export { forgot, reset, twoFaSetup, twoFaEnable, twoFaDisable };
