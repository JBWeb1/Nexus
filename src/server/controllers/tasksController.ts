import { ApiError,toCamel,today,isDate } from '../utils/helpers';
import { pool,authPool } from '../db';
const CHECKLIST = [['import', 'Import bank statement', '/banking'], ['reconcile', 'Reconcile bank transactions', '/banking'], ['uncategorised', 'Review uncategorised bank lines', '/banking'], ['debtors', 'Review debtors and chase overdue invoices', '/invoices'],
  ['creditors', 'Review creditors and bills due', '/bills'], ['drafts', 'Clear draft invoices and bills', '/work-queue'], ['vat', 'Check VAT for the period', '/vat201'], ['review', 'Accountant review of the work queue', '/work-queue'], ['report', 'Send the client their monthly report', '/reports'], ['close', 'Close the month', '/month-end']];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
async function member(orgId, userId) { if (!userId) return null; const m = (await authPool.query('SELECT u.id, u.name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.user_id=$2', [orgId, userId])).rows[0]; if (!m) throw new ApiError(400, 'That person does not have access to this company'); return m; }
const me = async (req) => (await authPool.query('SELECT name FROM users WHERE id=$1', [req.user.userId])).rows[0]?.name || 'Someone';

async function list(req, res, c) {
  const p = [req.user.orgId]; let w = 'organization_id=$1'; if (req.query.status) { p.push(req.query.status); w += ` AND status=$${p.length}`; }
  const rows = (await c.query(`SELECT * FROM tasks WHERE ${w} ORDER BY status DESC, due_date NULLS LAST, period, sort, created_at`, p)).rows;
  const people = (await authPool.query('SELECT u.id, u.name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY lower(u.name)', [req.user.orgId])).rows;
  res.json({ tasks: toCamel(rows), people });
}
async function create(req, res, c) {
  const b = req.body || {}; if (!String(b.title || '').trim()) throw new ApiError(400, 'What needs doing?'); if (b.dueDate && !isDate(b.dueDate)) throw new ApiError(400, 'Valid due date required');
  const a = await member(req.user.orgId, b.assigneeId);
  const r = await c.query('INSERT INTO tasks (organization_id, title, notes, due_date, assignee_id, assignee_name, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [req.user.orgId, String(b.title).trim().slice(0, 200), b.notes?.trim() || null, b.dueDate || null, a?.id || null, a?.name || null, req.user.userId]);
  res.status(201).json({ task: toCamel(r.rows[0]) });
}
async function update(req, res, c) {
  const t = (await c.query('SELECT * FROM tasks WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, req.user.orgId])).rows[0]; if (!t) throw new ApiError(404, 'Task not found');
  const b = req.body || {}; const set = [], p = [t.id]; const put = (col, v) => { p.push(v); set.push(`${col}=$${p.length}`); };
  if (b.title !== undefined) { if (!String(b.title).trim()) throw new ApiError(400, 'A task needs a title'); put('title', String(b.title).trim().slice(0, 200)); }
  if (b.notes !== undefined) put('notes', b.notes?.trim() || null);
  if (b.dueDate !== undefined) { if (b.dueDate && !isDate(b.dueDate)) throw new ApiError(400, 'Valid due date required'); put('due_date', b.dueDate || null); }
  if (b.assigneeId !== undefined) { const a = await member(req.user.orgId, b.assigneeId); put('assignee_id', a?.id || null); put('assignee_name', a?.name || null); }
  if (b.status !== undefined) { if (!['OPEN', 'DONE'].includes(b.status)) throw new ApiError(400, 'Status must be OPEN or DONE'); put('status', b.status); put('completed_at', b.status === 'DONE' ? new Date() : null); put('completed_by_name', b.status === 'DONE' ? await me(req) : null); }
  if (!set.length) throw new ApiError(400, 'Nothing to change');
  res.json({ task: toCamel((await c.query(`UPDATE tasks SET ${set.join(', ')} WHERE id=$1 RETURNING *`, p)).rows[0]) });
}
async function remove(req, res, c) { const r = await c.query('DELETE FROM tasks WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId]); if (!r.rowCount) throw new ApiError(404, 'Task not found'); res.json({ ok: true }); }
/** Creates the ten-step monthly bookkeeping checklist for a period. Safe to run twice: existing steps are left alone. */
async function checklist(req, res, c) {
  const period = req.body?.period; if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) throw new ApiError(400, 'Month must look like 2026-09');
  const [y, m] = period.split('-').map(Number); const due = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10); const a = await member(req.user.orgId, req.body?.assigneeId); let created = 0;
  for (const [i, [key, title, link]] of CHECKLIST.entries()) {
    const r = await c.query('INSERT INTO tasks (organization_id, title, due_date, assignee_id, assignee_name, period, template_key, sort, link, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (organization_id, period, template_key) WHERE template_key IS NOT NULL DO NOTHING', [req.user.orgId, `${title} (${MONTHS[m - 1]} ${y})`, due, a?.id || null, a?.name || null, period, key, i, link, req.user.userId]);
    created += r.rowCount;
  }
  res.status(201).json({ created, total: CHECKLIST.length, dueDate: due });
}
/** Across every company this person belongs to: open work, what is overdue, and who is carrying it. */
async function practice(req, res, c) {
  const orgs = (await c.query('SELECT o.id, o.name, m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 ORDER BY lower(o.name)', [req.user.userId])).rows;
  const t = today(); const wk = new Date(Date.parse(t) + 7 * 86400000).toISOString().slice(0, 10); const companies = []; const load = new Map(); const totals = { open: 0, overdue: 0, dueThisWeek: 0 };
  for (const o of orgs) {
    await pool.tx(async (k) => {
      const rows = (await k.query("SELECT title, due_date, assignee_id, assignee_name FROM tasks WHERE status='OPEN' ORDER BY due_date NULLS LAST, sort")).rows;
      const overdue = rows.filter((r) => r.due_date && r.due_date < t).length, soon = rows.filter((r) => r.due_date && r.due_date >= t && r.due_date <= wk).length;
      totals.open += rows.length; totals.overdue += overdue; totals.dueThisWeek += soon;
      for (const r of rows) { const key = r.assignee_id || 'none'; const x = load.get(key) || { id: r.assignee_id, name: r.assignee_name || 'Unassigned', open: 0, overdue: 0 }; x.open++; if (r.due_date && r.due_date < t) x.overdue++; load.set(key, x); }
      companies.push({ id: o.id, name: o.name, role: o.role, active: o.id === req.user.orgId, open: rows.length, overdue, dueThisWeek: soon, next: rows[0] ? { title: rows[0].title, dueDate: rows[0].due_date } : null });
    }, o.id);
  }
  res.json({ totals, companies, workload: [...load.values()].sort((a, b) => b.open - a.open) });
}
export { list, create, update, remove, checklist, practice };
