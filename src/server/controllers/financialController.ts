import { ApiError,toCamel,isDate } from '../utils/helpers';
const listYears = async (req, res, c) => res.json({ financialYears: toCamel((await c.query('SELECT * FROM financial_years WHERE organization_id=$1 ORDER BY start_date DESC', [req.user.orgId])).rows) });
async function closeYear(req, res, c) {
  const fy = (await c.query('SELECT * FROM financial_years WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, req.user.orgId])).rows[0];
  if (!fy) throw new ApiError(404, 'Financial year not found');
  if (fy.status === 'CLOSED') throw new ApiError(409, 'Financial year is already closed');
  await c.query("UPDATE financial_years SET status='CLOSED' WHERE id=$1", [fy.id]);
  await c.query(`INSERT INTO period_locks (organization_id, locked_through) VALUES ($1,$2) ON CONFLICT (organization_id) DO UPDATE SET locked_through=GREATEST(period_locks.locked_through, EXCLUDED.locked_through), updated_at=now()`, [req.user.orgId, fy.end_date]);
  res.json({ financialYear: toCamel({ ...fy, status: 'CLOSED' }) });
}
async function getLock(req, res, c) {
  const r = await c.query('SELECT locked_through FROM period_locks WHERE organization_id=$1', [req.user.orgId]);
  res.json({ lockedThrough: r.rows[0]?.locked_through || null });
}
async function setLock(req, res, c) {
  const { lockedThrough } = req.body || {};
  if (lockedThrough === null) { await c.query('DELETE FROM period_locks WHERE organization_id=$1', [req.user.orgId]); return res.json({ lockedThrough: null }); }
  if (!isDate(lockedThrough)) throw new ApiError(400, 'lockedThrough must be a YYYY-MM-DD date or null');
  await c.query(`INSERT INTO period_locks (organization_id, locked_through) VALUES ($1,$2) ON CONFLICT (organization_id) DO UPDATE SET locked_through=EXCLUDED.locked_through, updated_at=now()`, [req.user.orgId, lockedThrough]);
  res.json({ lockedThrough });
}
export { listYears, closeYear, getLock, setLock };
