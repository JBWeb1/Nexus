/**
 * Projects (jobs): tag invoice and bill lines with a project to see what each job earned and cost, log hours against it,
 * and turn billable hours into an invoice. Profit = invoiced (less credit notes) - bills - cost of stock sold on the job.
 */
import { ApiError, toCamel, money, today, isDate, addDays } from '../utils/helpers';
import { accountByCode } from '../utils/ledger';
import { termsDays } from '../utils/documents';
import { createInvoiceRecord } from './invoicesController';
import { authPool } from '../db';

/** Income, costs and hours per project, in rand. Draft and void documents do not count. */
async function summaries(c, orgId: string, ids: string[]) {
  const map = new Map(ids.map((id) => [id, { income: 0, credits: 0, costs: 0, stockCost: 0, hours: 0, billableHours: 0, unbilledHours: 0, unbilledValue: 0 }]));
  if (!ids.length) return map;
  const add = (rows, key) => rows.forEach((r) => { const s = map.get(r.project_id); if (s) s[key] = money(Number(r.v)); });
  add((await c.query(`SELECT l.project_id, SUM(l.line_total * i.exchange_rate) AS v FROM invoice_lines l JOIN invoices i ON i.id=l.invoice_id
      WHERE i.organization_id=$1 AND l.project_id = ANY($2::text[]) AND i.status NOT IN ('DRAFT','VOID') GROUP BY l.project_id`, [orgId, ids])).rows, 'income');
  add((await c.query(`SELECT l.project_id, SUM(l.line_total * n.exchange_rate) AS v FROM credit_note_lines l JOIN credit_notes n ON n.id=l.credit_note_id
      WHERE n.organization_id=$1 AND l.project_id = ANY($2::text[]) AND n.status <> 'VOID' GROUP BY l.project_id`, [orgId, ids])).rows, 'credits');
  // Stock bought for a job is not a cost until it is used: those lines went to the stock account, and count when sold.
  add((await c.query(`SELECT l.project_id, SUM(l.line_total * b.exchange_rate) AS v FROM bill_lines l JOIN bills b ON b.id=l.bill_id JOIN accounts a ON a.id=l.account_id
      WHERE b.organization_id=$1 AND l.project_id = ANY($2::text[]) AND b.status NOT IN ('DRAFT','VOID') AND a.type <> 'ASSET' GROUP BY l.project_id`, [orgId, ids])).rows, 'costs');
  add((await c.query(`SELECT project_id, -SUM(value) AS v FROM stock_movements WHERE organization_id=$1 AND project_id = ANY($2::text[]) AND source_table='invoices' GROUP BY project_id`, [orgId, ids])).rows, 'stockCost');
  const t = (await c.query(`SELECT t.project_id, SUM(t.hours) AS hours, SUM(t.hours) FILTER (WHERE t.billable) AS billable,
      SUM(t.hours) FILTER (WHERE t.billable AND t.invoice_id IS NULL) AS unbilled, SUM(t.hours * COALESCE(t.rate, p.hourly_rate, 0)) FILTER (WHERE t.billable AND t.invoice_id IS NULL) AS unbilled_value
      FROM time_entries t JOIN projects p ON p.id=t.project_id WHERE t.organization_id=$1 AND t.project_id = ANY($2::text[]) GROUP BY t.project_id`, [orgId, ids])).rows;
  for (const r of t) { const s = map.get(r.project_id); if (!s) continue; s.hours = Number(r.hours || 0); s.billableHours = Number(r.billable || 0); s.unbilledHours = Number(r.unbilled || 0); s.unbilledValue = money(Number(r.unbilled_value || 0)); }
  for (const s of map.values()) Object.assign(s, { netIncome: money(s.income - s.credits), totalCosts: money(s.costs + s.stockCost), profit: money(s.income - s.credits - s.costs - s.stockCost) });
  return map;
}
const withSummary = async (c, orgId, rows) => { const m = await summaries(c, orgId, rows.map((r) => r.id)); return rows.map((r) => ({ ...toCamel(r), summary: m.get(r.id) })); };

async function list(req, res, c) {
  const rows = (await c.query(`SELECT p.*, c.name AS contact_name FROM projects p LEFT JOIN contacts c ON c.id=p.contact_id
     WHERE p.organization_id=$1 AND ($2::text IS NULL OR p.status=$2) ORDER BY p.status, p.name`, [req.user.orgId, req.query.status || null])).rows;
  res.json({ projects: await withSummary(c, req.user.orgId, rows) });
}
async function load(c, orgId, id) {
  const p = (await c.query('SELECT p.*, c.name AS contact_name FROM projects p LEFT JOIN contacts c ON c.id=p.contact_id WHERE p.id=$1 AND p.organization_id=$2', [id, orgId])).rows[0];
  if (!p) throw new ApiError(404, 'Project not found'); return p;
}
async function get(req, res, c) {
  const orgId = req.user.orgId; const p = await load(c, orgId, req.params.id);
  const time = (await c.query('SELECT t.*, i.number AS invoice_number FROM time_entries t LEFT JOIN invoices i ON i.id=t.invoice_id WHERE t.project_id=$1 ORDER BY t.date DESC, t.created_at DESC', [p.id])).rows;
  const docs = (await c.query(`SELECT 'invoice' AS kind, i.id, i.number, i.issue_date AS date, i.status, c.name AS contact_name, SUM(l.line_total * i.exchange_rate) AS amount
        FROM invoice_lines l JOIN invoices i ON i.id=l.invoice_id JOIN contacts c ON c.id=i.contact_id WHERE l.project_id=$1 GROUP BY i.id, c.name
      UNION ALL SELECT 'bill', b.id, b.number, b.issue_date, b.status, c.name, SUM(l.line_total * b.exchange_rate)
        FROM bill_lines l JOIN bills b ON b.id=l.bill_id JOIN contacts c ON c.id=b.contact_id WHERE l.project_id=$1 GROUP BY b.id, c.name
      UNION ALL SELECT 'credit note', n.id, n.number, n.issue_date, n.status, c.name, -SUM(l.line_total * n.exchange_rate)
        FROM credit_note_lines l JOIN credit_notes n ON n.id=l.credit_note_id JOIN contacts c ON c.id=n.contact_id WHERE l.project_id=$1 GROUP BY n.id, c.name
      ORDER BY date DESC`, [p.id])).rows;
  res.json({ project: (await withSummary(c, orgId, [p]))[0], timeEntries: toCamel(time), documents: toCamel(docs.map((d) => ({ ...d, amount: money(Number(d.amount)) }))) });
}
async function clean(c, orgId, b, ex: any = {}) {
  const v = { ...toCamel(ex), ...b }; const name = String(v.name || '').trim().slice(0, 200); if (!name) throw new ApiError(400, 'Enter the project name');
  if (v.contactId && !(await c.query('SELECT 1 FROM contacts WHERE id=$1 AND organization_id=$2', [v.contactId, orgId])).rowCount) throw new ApiError(400, 'Unknown customer');
  const num = (x, label) => { if (x === undefined || x === null || x === '') return null; const n = Number(x); if (!isFinite(n) || n < 0) throw new ApiError(400, `${label} must be 0 or more`); return n; };
  const status = v.status || 'ACTIVE'; if (!['ACTIVE', 'COMPLETED', 'ARCHIVED'].includes(status)) throw new ApiError(400, 'Unknown status');
  return [name, v.contactId || null, status, num(v.hourlyRate, 'Hourly rate'), num(v.budget, 'Budget'), v.notes ? String(v.notes).slice(0, 2000) : null];
}
async function create(req, res, c) {
  const orgId = req.user.orgId; const v = await clean(c, orgId, req.body || {});
  const p = (await c.query('INSERT INTO projects (organization_id, name, contact_id, status, hourly_rate, budget, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [orgId, ...v])).rows[0];
  res.status(201).json({ project: (await withSummary(c, orgId, [await load(c, orgId, p.id)]))[0] });
}
async function update(req, res, c) {
  const orgId = req.user.orgId; const ex = await load(c, orgId, req.params.id); const v = await clean(c, orgId, req.body || {}, ex);
  await c.query('UPDATE projects SET name=$2, contact_id=$3, status=$4, hourly_rate=$5, budget=$6, notes=$7 WHERE id=$1', [ex.id, ...v]);
  res.json({ project: (await withSummary(c, orgId, [await load(c, orgId, ex.id)]))[0] });
}

async function addTime(req, res, c) {
  const orgId = req.user.orgId, b = req.body || {}; const p = await load(c, orgId, req.params.id);
  if (p.status === 'ARCHIVED') throw new ApiError(409, 'This project is archived');
  const date = b.date || today(); if (!isDate(date)) throw new ApiError(400, 'Enter the date worked');
  const hours = Number(b.hours); if (!(hours > 0 && hours <= 24)) throw new ApiError(400, 'Hours must be more than 0 and at most 24');
  const description = String(b.description || '').trim().slice(0, 500); if (!description) throw new ApiError(400, 'Say what the time was spent on');
  const rate = b.rate === undefined || b.rate === '' || b.rate === null ? null : Number(b.rate); if (rate !== null && !(rate >= 0)) throw new ApiError(400, 'Rate must be 0 or more');
  const u = (await authPool.query('SELECT name FROM users WHERE id=$1', [req.user.userId])).rows[0];
  const t = (await c.query('INSERT INTO time_entries (organization_id, project_id, user_id, user_name, date, hours, description, billable, rate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [orgId, p.id, req.user.userId, u?.name || null, date, Math.round(hours * 100) / 100, description, b.billable !== false, rate])).rows[0];
  res.status(201).json({ timeEntry: toCamel(t) });
}
async function removeTime(req, res, c) {
  const t = (await c.query('SELECT * FROM time_entries WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.entryId, req.user.orgId])).rows[0];
  if (!t) throw new ApiError(404, 'Time entry not found'); if (t.invoice_id) throw new ApiError(409, 'This time has been invoiced. Void the invoice first.');
  await c.query('DELETE FROM time_entries WHERE id=$1', [t.id]); res.json({ ok: true });
}

/** Billable hours not yet invoiced become a draft invoice to the project's customer, one line per entry. */
async function invoiceTime(req, res, c) {
  const orgId = req.user.orgId, b = req.body || {}; const p = await load(c, orgId, req.params.id);
  if (!p.contact_id) throw new ApiError(400, 'Choose the customer for this project first');
  const issueDate = b.issueDate || today(); if (!isDate(issueDate)) throw new ApiError(400, 'Enter the invoice date');
  const pick = Array.isArray(b.entryIds) && b.entryIds.length ? b.entryIds : null;
  const entries = (await c.query(`SELECT * FROM time_entries WHERE project_id=$1 AND billable AND invoice_id IS NULL AND date <= $2 AND ($3::text[] IS NULL OR id = ANY($3::text[])) ORDER BY date, created_at FOR UPDATE`, [p.id, issueDate, pick])).rows;
  if (!entries.length) throw new ApiError(400, 'There are no billable hours to invoice up to that date');
  const missing = entries.find((t) => t.rate === null && p.hourly_rate === null); if (missing) throw new ApiError(400, `Set an hourly rate on the project (or on the entry of ${missing.date}) first`);
  const accountId = b.accountId || await accountByCode(c, orgId, '4000');
  const taxRateId = b.taxRateId === undefined ? (await c.query('SELECT id FROM tax_rates WHERE organization_id=$1 AND is_default LIMIT 1', [orgId])).rows[0]?.id || null : b.taxRateId || null;
  const inv = await createInvoiceRecord(c, orgId, { contactId: p.contact_id, issueDate, dueDate: addDays(issueDate, await termsDays(c, orgId)), notes: `Time on ${p.name}`,
    lines: entries.map((t) => ({ description: `${t.date} ${t.description}${t.user_name ? ` (${t.user_name})` : ''}`, quantity: Number(t.hours), unitPrice: Number(t.rate ?? p.hourly_rate), accountId, taxRateId, projectId: p.id })) });
  await c.query('UPDATE time_entries SET invoice_id=$2 WHERE id = ANY($1::text[])', [entries.map((t) => t.id), inv.id]);
  res.status(201).json({ invoice: toCamel(inv), entries: entries.length });
}
export { list, get, create, update, addTime, removeTime, invoiceTime };
