import { ApiError,toCamel,addDays,addMonths,today,isDate } from '../utils/helpers';
import { priceLines,validateHeader } from '../utils/documents';
import { createInvoiceRecord } from './invoicesController';
const FREQ = { WEEKLY: (d) => addDays(d, 7), MONTHLY: (d) => addMonths(d, 1), QUARTERLY: (d) => addMonths(d, 3), ANNUALLY: (d) => addMonths(d, 12) };

const withLines = async (c, r) => {
  const lines = (await c.query('SELECT rl.*, a.name AS account_name FROM recurring_invoice_lines rl JOIN accounts a ON a.id=rl.account_id WHERE rl.recurring_invoice_id=$1 ORDER BY rl.id', [r.id])).rows;
  const contact = (await c.query('SELECT id, name FROM contacts WHERE id=$1', [r.contact_id])).rows[0];
  return toCamel({ ...r, lines, contact });
};
async function list(req, res, c) {
  const r = await c.query('SELECT r.*, c.name AS contact_name FROM recurring_invoices r JOIN contacts c ON c.id=r.contact_id WHERE r.organization_id=$1 ORDER BY r.next_run_date', [req.user.orgId]);
  res.json({ recurringInvoices: toCamel(r.rows) });
}
async function get(req, res, c) {
  const r = await c.query('SELECT * FROM recurring_invoices WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId]);
  if (!r.rowCount) throw new ApiError(404, 'Recurring invoice not found'); res.json({ recurringInvoice: await withLines(c, r.rows[0]) });
}
async function create(req, res, c) {
  const orgId = req.user.orgId, b = { issueDate: req.body?.startDate, ...req.body };
  if (!FREQ[b.frequency]) throw new ApiError(400, 'Frequency must be WEEKLY, MONTHLY, QUARTERLY or ANNUALLY');
  const h = validateHeader(b, { dueField: 'endDate' });
  if (!(await c.query('SELECT 1 FROM contacts WHERE id=$1 AND organization_id=$2', [b.contactId, orgId])).rowCount) throw new ApiError(400, 'Unknown contact');
  const priced = await priceLines(c, orgId, b.lines);
  const r = (await c.query(`INSERT INTO recurring_invoices (organization_id, contact_id, frequency, start_date, next_run_date, end_date, due_days, currency, exchange_rate, notes)
     VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9) RETURNING *`, [orgId, b.contactId, b.frequency, b.startDate, b.endDate || null, Number.isInteger(+b.dueDays) ? +b.dueDays : 30, h.currency, h.exchangeRate, b.notes || null])).rows[0];
  for (const l of priced.lines) await c.query('INSERT INTO recurring_invoice_lines (recurring_invoice_id, description, quantity, unit_price, account_id, tax_rate_id) VALUES ($1,$2,$3,$4,$5,$6)', [r.id, l.description, l.quantity, l.unitPrice, l.accountId, l.taxRateId]);
  res.status(201).json({ recurringInvoice: await withLines(c, r) });
}
/** On-demand generation (no scheduler): creates DRAFT invoices for every ACTIVE template due on/before today. */
async function runDue(req, res, c) {
  const orgId = req.user.orgId, t = today(), generated = [];
  const due = (await c.query("SELECT * FROM recurring_invoices WHERE organization_id=$1 AND status='ACTIVE' AND next_run_date <= $2 ORDER BY next_run_date FOR UPDATE", [orgId, t])).rows;
  for (const r of due) {
    const lines = (await c.query('SELECT * FROM recurring_invoice_lines WHERE recurring_invoice_id=$1', [r.id])).rows;
    let next = r.next_run_date, last = r.last_run_date, guard = 0, status = 'ACTIVE';
    while (next <= t && guard++ < 12) {
      if (r.end_date && next > r.end_date) { status = 'ENDED'; break; }
      const inv = await createInvoiceRecord(c, orgId, { contactId: r.contact_id, issueDate: next, dueDate: addDays(next, r.due_days), currency: r.currency, exchangeRate: r.exchange_rate, notes: r.notes,
        lines: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unit_price, accountId: l.account_id, taxRateId: l.tax_rate_id })) });
      generated.push({ recurringInvoiceId: r.id, invoiceId: inv.id, number: inv.number, issueDate: next });
      last = next; next = FREQ[r.frequency](next);
    }
    if (r.end_date && next > r.end_date) status = 'ENDED';
    await c.query('UPDATE recurring_invoices SET next_run_date=$2, last_run_date=$3, status=$4 WHERE id=$1', [r.id, next, last, status]);
  }
  res.json({ generated, count: generated.length });
}
const setStatus = (from, to) => async (req, res, c) => {
  const r = (await c.query('SELECT * FROM recurring_invoices WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, req.user.orgId])).rows[0];
  if (!r) throw new ApiError(404, 'Recurring invoice not found');
  if (r.status !== from) throw new ApiError(409, `Must be ${from} (it is ${r.status})`);
  res.json({ recurringInvoice: await withLines(c, (await c.query('UPDATE recurring_invoices SET status=$2 WHERE id=$1 RETURNING *', [r.id, to])).rows[0]) });
};
const pause = setStatus('ACTIVE', 'PAUSED');
const resume = setStatus('PAUSED', 'ACTIVE');
export { list, get, create, runDue, pause, resume };
