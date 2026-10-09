import { ApiError,newId,toCamel } from '../utils/helpers';
import { sendMail,configured } from '../utils/mailer';
const ROLES = ['ADMIN', 'ACCOUNTANT', 'VIEWER'];
const manager = (req) => { if (!['OWNER', 'ADMIN'].includes(req.user.role)) throw new ApiError(403, 'Only an owner or admin can manage the team'); };

async function list(req, res, c) {
  const org = req.user.orgId;
  const members = (await c.query(`SELECT u.id, u.name, u.email, m.role, m.created_at FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY CASE m.role WHEN 'OWNER' THEN 0 ELSE 1 END, lower(u.name)`, [org])).rows;
  const invitations = (await c.query('SELECT id, email, role, created_at FROM invitations WHERE organization_id=$1 ORDER BY created_at DESC', [org])).rows;
  res.json({ members: toCamel(members).map((m) => ({ ...m, you: m.id === req.user.userId })), invitations: toCamel(invitations), canManage: ['OWNER', 'ADMIN'].includes(req.user.role), emailConfigured: configured() });
}
/** Existing user -> added at once. Unknown email -> pending invitation, accepted automatically when they register. */
async function invite(req, res, c) {
  manager(req);
  const email = String(req.body?.email || '').trim().toLowerCase(); const role = req.body?.role || 'ACCOUNTANT';
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Enter a valid email address');
  if (!ROLES.includes(role)) throw new ApiError(400, 'Role must be Admin, Accountant or Viewer');
  const org = (await c.query('SELECT name FROM organizations WHERE id=$1', [req.user.orgId])).rows[0];
  const u = (await c.query('SELECT id, name FROM users WHERE email=$1', [email])).rows[0]; let status;
  if (u) {
    if ((await c.query('SELECT 1 FROM memberships WHERE user_id=$1 AND organization_id=$2', [u.id, req.user.orgId])).rowCount) throw new ApiError(409, 'This person already has access');
    await c.query('INSERT INTO memberships (user_id, organization_id, role) VALUES ($1,$2,$3)', [u.id, req.user.orgId, role]); status = 'added';
  } else {
    if ((await c.query('SELECT 1 FROM invitations WHERE organization_id=$1 AND lower(email)=$2', [req.user.orgId, email])).rowCount) throw new ApiError(409, 'This person has already been invited');
    await c.query('INSERT INTO invitations (id, organization_id, email, role, invited_by) VALUES ($1,$2,$3,$4,$5)', [newId('ivt'), req.user.orgId, email, role, req.user.userId]); status = 'invited';
  }
  let emailed = false;
  if (configured()) { try { await sendMail({ to: email, subject: `You've been given access to ${org.name} on Nexus Ledger`, text: status === 'added' ? `You now have ${role.toLowerCase()} access to ${org.name}. Sign in and use the company switcher to open it.` : `You've been invited to ${org.name} as ${role.toLowerCase()}. Create your free account with this email address and the company will appear in your switcher.` }); emailed = true; } catch (_) {} }
  res.status(201).json({ status, emailed });
}
async function changeRole(req, res, c) {
  manager(req); const role = req.body?.role; if (!ROLES.includes(role)) throw new ApiError(400, 'Role must be Admin, Accountant or Viewer');
  const m = (await c.query('SELECT role FROM memberships WHERE user_id=$1 AND organization_id=$2', [req.params.userId, req.user.orgId])).rows[0];
  if (!m) throw new ApiError(404, 'Member not found'); if (m.role === 'OWNER') throw new ApiError(409, "An owner's role cannot be changed here");
  await c.query('UPDATE memberships SET role=$3 WHERE user_id=$1 AND organization_id=$2', [req.params.userId, req.user.orgId, role]); res.json({ ok: true });
}
async function removeMember(req, res, c) {
  manager(req); const org = req.user.orgId;
  const m = (await c.query('SELECT role FROM memberships WHERE user_id=$1 AND organization_id=$2', [req.params.userId, org])).rows[0];
  if (!m) throw new ApiError(404, 'Member not found'); if (m.role === 'OWNER') throw new ApiError(409, 'An owner cannot be removed');
  const other = (await c.query('SELECT organization_id FROM memberships WHERE user_id=$1 AND organization_id<>$2 ORDER BY created_at LIMIT 1', [req.params.userId, org])).rows[0];
  if (!other) throw new ApiError(409, "This is the person's only company, so they cannot be removed without leaving them with nowhere to sign in");
  await c.query('DELETE FROM memberships WHERE user_id=$1 AND organization_id=$2', [req.params.userId, org]);
  await c.query('UPDATE users SET organization_id=$2 WHERE id=$1 AND organization_id=$3', [req.params.userId, other.organization_id, org]);
  res.json({ ok: true });
}
async function cancelInvite(req, res, c) {
  manager(req); const r = await c.query('DELETE FROM invitations WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId]); if (!r.rowCount) throw new ApiError(404, 'Invitation not found'); res.json({ ok: true });
}
/** Called at registration: any invitation for this email becomes a membership. */
async function acceptInvitations(c, userId, email) {
  const inv = (await c.query('DELETE FROM invitations WHERE lower(email)=$1 RETURNING organization_id, role', [email.toLowerCase()])).rows;
  for (const i of inv) await c.query('INSERT INTO memberships (user_id, organization_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [userId, i.organization_id, i.role]);
  return inv.length;
}
export { list, invite, changeRole, removeMember, cancelInvite, acceptInvitations };
