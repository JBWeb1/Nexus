/**
 * Passkeys and hardware security keys (WebAuthn): sign in with a fingerprint, face, Windows Hello, a phone or a YubiKey
 * instead of a password. The device keeps the private key; Nexus stores only the public key.
 * Sign-in asks the device to check it is really the person (fingerprint, face or PIN), so a passkey counts as two
 * factors on its own and skips the authenticator-app code.
 */
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { ApiError, toCamel } from '../utils/helpers';
import { signToken } from '../utils/auth';
import { authPool } from '../db';

const MAX_PASSKEYS = 10;
/** Where passkeys are valid: the site's hostname and exact origin. Taken from APP_URL unless set on their own. */
export function relyingParty() {
  const app = new URL(process.env.APP_URL || 'http://localhost:3000');
  return { rpID: process.env.WEBAUTHN_RP_ID || app.hostname, origin: (process.env.WEBAUTHN_ORIGIN || app.origin).replace(/\/$/, ''), rpName: 'Nexus Ledger' };
}

async function saveChallenge(c, challenge: string, purpose: 'REGISTER' | 'LOGIN', userId: string | null) {
  await c.query('DELETE FROM auth_challenges WHERE expires_at < now()');
  return (await c.query('INSERT INTO auth_challenges (challenge, purpose, user_id) VALUES ($1,$2,$3) RETURNING id', [challenge, purpose, userId])).rows[0].id as string;
}
/**
 * Each challenge works once and for five minutes, so a captured response cannot be replayed. It is deleted in its own
 * commit, outside the request's transaction, so a failed attempt still uses it up.
 */
async function takeChallenge(id: unknown, purpose: string, userId: string | null) {
  if (typeof id !== 'string' || !id) throw new ApiError(400, 'Start again: the passkey request is missing');
  const row = (await authPool.query('DELETE FROM auth_challenges WHERE id=$1 AND purpose=$2 RETURNING challenge, user_id, expires_at > now() AS live', [id, purpose])).rows[0];
  if (!row || !row.live || (userId && row.user_id !== userId)) throw new ApiError(400, 'That passkey request expired. Please try again.');
  return row.challenge as string;
}

// ── Signing in (no session yet) ─────────────────────────────────────────────────────────────────
async function loginOptions(req, res, c) {
  const { rpID } = relyingParty();
  // No allowCredentials: the device offers the passkeys it holds for this site, so nobody has to type an email first.
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' });
  res.json({ options, challengeId: await saveChallenge(c, options.challenge, 'LOGIN', null) });
}
async function loginVerify(req, res, c) {
  const { rpID, origin } = relyingParty(); const response = req.body?.response;
  const expectedChallenge = await takeChallenge(req.body?.challengeId, 'LOGIN', null);
  if (!response?.id) throw new ApiError(400, 'No passkey response was sent');
  const pk = (await c.query('SELECT * FROM passkeys WHERE credential_id=$1', [response.id])).rows[0];
  if (!pk) throw new ApiError(401, 'This passkey is not registered with Nexus. Sign in with your password, then add it under Settings.');
  let v;
  try {
    v = await verifyAuthenticationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
      authenticator: { credentialID: isoBase64URL.toBuffer(pk.credential_id), credentialPublicKey: new Uint8Array(pk.public_key), counter: Number(pk.counter), transports: pk.transports } });
  } catch { throw new ApiError(401, 'The passkey could not be verified'); }
  if (!v.verified) throw new ApiError(401, 'The passkey could not be verified');
  await c.query('UPDATE passkeys SET counter=$2, last_used_at=now() WHERE id=$1', [pk.id, v.authenticationInfo.newCounter]);
  const u = (await c.query(`SELECT u.*, o.name AS org_name, o.currency, m.role AS member_role FROM users u
      JOIN memberships m ON m.user_id=u.id AND m.organization_id=u.organization_id JOIN organizations o ON o.id=u.organization_id WHERE u.id=$1`, [pk.user_id])).rows[0];
  if (!u) throw new ApiError(401, 'This account no longer has access to a company');
  u.role = u.member_role;
  res.json({ token: signToken(u), user: { id: u.id, name: u.name, email: u.email, role: u.role }, organization: { id: u.organization_id, name: u.org_name, currency: u.currency } });
}

// ── Managing your passkeys (signed in) ──────────────────────────────────────────────────────────
const COLS = 'id, name, transports, created_at, last_used_at';
async function list(req, res, c) {
  res.json({ passkeys: toCamel((await c.query(`SELECT ${COLS} FROM passkeys WHERE user_id=$1 ORDER BY created_at`, [req.user.userId])).rows) });
}
async function registerOptions(req, res, c) {
  const { rpID, rpName } = relyingParty();
  const u = (await c.query('SELECT id, name, email FROM users WHERE id=$1', [req.user.userId])).rows[0];
  const existing = (await c.query('SELECT credential_id, transports FROM passkeys WHERE user_id=$1', [u.id])).rows;
  if (existing.length >= MAX_PASSKEYS) throw new ApiError(400, `You can have up to ${MAX_PASSKEYS} passkeys. Remove one you no longer use first.`);
  const options = await generateRegistrationOptions({ rpName, rpID, userID: u.id, userName: u.email, userDisplayName: u.name, attestationType: 'none',
    excludeCredentials: existing.map((p) => ({ id: isoBase64URL.toBuffer(p.credential_id), type: 'public-key' as const, transports: p.transports })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' } });
  res.json({ options, challengeId: await saveChallenge(c, options.challenge, 'REGISTER', u.id) });
}
async function register(req, res, c) {
  const { rpID, origin } = relyingParty(); const response = req.body?.response;
  const name = String(req.body?.name || '').trim().slice(0, 60) || 'Passkey';
  const expectedChallenge = await takeChallenge(req.body?.challengeId, 'REGISTER', req.user.userId);
  let v;
  try { v = await verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true }); }
  catch { throw new ApiError(400, 'The passkey could not be added. Please try again.'); }
  if (!v.verified || !v.registrationInfo) throw new ApiError(400, 'The passkey could not be added. Please try again.');
  const { credentialID, credentialPublicKey, counter } = v.registrationInfo;
  const r = await c.query(`INSERT INTO passkeys (user_id, credential_id, public_key, counter, transports, name) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (credential_id) DO NOTHING RETURNING ${COLS}`,
    [req.user.userId, isoBase64URL.fromBuffer(credentialID), Buffer.from(credentialPublicKey), counter, response?.response?.transports || [], name]);
  if (!r.rowCount) throw new ApiError(409, 'This passkey is already registered');
  res.status(201).json({ passkey: toCamel(r.rows[0]) });
}
async function remove(req, res, c) {
  const r = await c.query('DELETE FROM passkeys WHERE id=$1 AND user_id=$2', [req.params.id, req.user.userId]);
  if (!r.rowCount) throw new ApiError(404, 'Passkey not found');
  res.json({ ok: true });
}
export { loginOptions, loginVerify, list, registerOptions, register, remove };
