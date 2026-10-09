import { acceptInvitations } from './teamController'; import { authPool } from '../db'; import { entitlement } from '../services/subscriptionService';
import { ApiError,newId,toCamel } from '../utils/helpers';
import { hashPassword,comparePassword,signToken,totp,unseal } from '../utils/auth';
import { seedChartOfAccounts } from '../utils/chart';
import { accountLock } from '../middleware/rateLimit';

async function register(req, res, client) {
  const { organizationName, name, email, password } = req.body || {};
  if (!organizationName?.trim() || !name?.trim() || !email?.trim()) throw new ApiError(400, 'Organization name, your name and email are required');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Invalid email address');
  if (!password || password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  const em = email.trim().toLowerCase();
  if ((await client.query('SELECT 1 FROM users WHERE email=$1', [em])).rowCount) throw new ApiError(409, 'An account with this email already exists');
  const orgId = newId('org'), userId = newId('usr');
  await client.query('INSERT INTO organizations (id, name) VALUES ($1,$2)', [orgId, organizationName.trim()]);
  await client.query("INSERT INTO users (id, organization_id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,$5,'OWNER')", [userId, orgId, em, await hashPassword(password), name.trim()]);
  await client.query("INSERT INTO memberships (user_id, organization_id, role) VALUES ($1,$2,'OWNER')", [userId, orgId]);
  await seedChartOfAccounts(client, orgId);
  await acceptInvitations(client, userId, em);
  const user = { id: userId, organization_id: orgId, role: 'OWNER' };
  res.status(201).json({ token: signToken(user), user: { id: userId, name: name.trim(), email: em, role: 'OWNER' }, organization: { id: orgId, name: organizationName.trim(), currency: 'ZAR' } });
}
async function login(req, res, client) {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiError(400, 'Email and password are required');
  const key = String(email).trim().toLowerCase(); accountLock.check(key);
  const u = (await client.query(`SELECT u.*, o.name AS org_name, o.currency, m.role AS member_role FROM users u
      JOIN memberships m ON m.user_id=u.id AND m.organization_id=u.organization_id JOIN organizations o ON o.id=u.organization_id WHERE u.email=$1`, [String(email).trim().toLowerCase()])).rows[0];
  if (!u || !(await comparePassword(password, u.password_hash))) { accountLock.fail(key); throw new ApiError(401, 'Invalid email or password'); }
  u.role = u.member_role;
  if (u.totp_enabled) {
    if (!req.body.code) return res.json({ needs2fa: true });
    if (!totp.verify(unseal(u.totp_secret), req.body.code)) { accountLock.fail(key); throw new ApiError(401, 'That two-factor code is not right'); }
  }
  accountLock.clear(key);
  res.json({ token: signToken(u), user: { id: u.id, name: u.name, email: u.email, role: u.role }, organization: { id: u.organization_id, name: u.org_name, currency: u.currency } });
}
async function me(req, res, client) {
  // Identity pool: the user row is tenant-scoped to their last-used company, which may not be the company this token is for.
  const u = (await authPool.query('SELECT id, name, email, totp_enabled FROM users WHERE id=$1', [req.user.userId])).rows[0];
  if (!u) throw new ApiError(401, 'User no longer exists');
  u.role = req.user.role; u.twoFactorEnabled = u.totp_enabled; delete u.totp_enabled;
  const o = (await client.query('SELECT id, name, currency, vat_number, vat_cycle, year_end_month, default_terms_days, accounting_style, onboarding_dismissed, plan, subscription_status, trial_ends_at, current_period_end FROM organizations WHERE id=$1', [req.user.orgId])).rows[0];
  const sub = req.subscription || entitlement(o); delete o.plan; delete o.subscription_status; delete o.trial_ends_at; delete o.current_period_end;
  res.json({ user: toCamel(u), organization: { ...toCamel(o), subscription: sub } });
}
export { register, login, me };
