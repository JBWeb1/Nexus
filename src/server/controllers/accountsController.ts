import { ApiError,toCamel } from '../utils/helpers';
const TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const list = async (req, res, c) => res.json({ accounts: toCamel((await c.query('SELECT * FROM accounts WHERE organization_id=$1 ORDER BY code', [req.user.orgId])).rows) });
async function create(req, res, c) {
  const { code, name, type } = req.body || {};
  if (!code?.trim() || !name?.trim() || !TYPES.includes(type)) throw new ApiError(400, 'Code, name and a valid type are required');
  const r = await c.query('INSERT INTO accounts (organization_id, code, name, type) VALUES ($1,$2,$3,$4) RETURNING *', [req.user.orgId, code.trim(), name.trim(), type]);
  res.status(201).json({ account: toCamel(r.rows[0]) });
}
async function update(req, res, c) {
  const a = (await c.query('SELECT * FROM accounts WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId])).rows[0];
  if (!a) throw new ApiError(404, 'Account not found');
  const { name, isActive } = req.body || {};
  const r = await c.query('UPDATE accounts SET name=COALESCE($2,name), is_active=COALESCE($3,is_active) WHERE id=$1 RETURNING *', [a.id, name?.trim() || null, typeof isActive === 'boolean' ? isActive : null]);
  res.json({ account: toCamel(r.rows[0]) });
}
async function remove(req, res, c) {
  const a = (await c.query('SELECT * FROM accounts WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId])).rows[0];
  if (!a) throw new ApiError(404, 'Account not found');
  if (a.is_system) throw new ApiError(409, 'System accounts cannot be deleted');
  if ((await c.query('SELECT 1 FROM journal_lines WHERE account_id=$1 LIMIT 1', [a.id])).rowCount) throw new ApiError(409, 'Account has transactions; deactivate it instead');
  await c.query('DELETE FROM accounts WHERE id=$1', [a.id]); res.json({ ok: true });
}
export { list, create, update, remove };
