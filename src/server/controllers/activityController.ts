import { toCamel } from '../utils/helpers';
async function list(req, res, c) {
  const lim = Math.min(Number(req.query.limit) || 100, 500); const p = [req.user.orgId]; let w = 'organization_id=$1'; if (req.query.q) { p.push(`%${String(req.query.q).replace(/[%_]/g, '\\$&')}%`); w += ` AND (action ILIKE $2 OR user_name ILIKE $2)`; }
  res.json({ activity: toCamel((await c.query(`SELECT id, user_name, action, method, path, created_at FROM activity_log WHERE ${w} ORDER BY created_at DESC LIMIT ${lim}`, p)).rows) });
}
export { list };
