import { ApiError,toCamel,addDays,today } from '../utils/helpers';
import { priceLines,validateHeader,nextNumber,insertLines,termsDays } from '../utils/documents';
import { createInvoiceRecord,withLines as invoiceWithLines } from './invoicesController';

const withLines = async (c, q) => {
  const lines = (await c.query('SELECT ql.*, a.name AS account_name FROM quote_lines ql JOIN accounts a ON a.id=ql.account_id WHERE ql.quote_id=$1 ORDER BY ql.id', [q.id])).rows;
  const contact = (await c.query('SELECT id, name, email, phone FROM contacts WHERE id=$1', [q.contact_id])).rows[0];
  return toCamel({ ...q, lines, contact });
};
async function list(req, res, c) {
  const r = await c.query(`SELECT q.*, c.name AS contact_name FROM quotes q JOIN contacts c ON c.id=q.contact_id WHERE q.organization_id=$1 ORDER BY q.issue_date DESC, q.number DESC`, [req.user.orgId]);
  res.json({ quotes: toCamel(r.rows) });
}
async function get(req, res, c) {
  const r = await c.query('SELECT * FROM quotes WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId]);
  if (!r.rowCount) throw new ApiError(404, 'Quote not found'); res.json({ quote: await withLines(c, r.rows[0]) });
}
async function create(req, res, c) {
  const orgId = req.user.orgId, b = req.body || {}; const h = validateHeader(b, { dueField: 'expiryDate' });
  if (!(await c.query('SELECT 1 FROM contacts WHERE id=$1 AND organization_id=$2', [b.contactId, orgId])).rowCount) throw new ApiError(400, 'Unknown contact');
  const priced = await priceLines(c, orgId, b.lines); const number = await nextNumber(c, orgId, 'quotes', 'QUO');
  const r = await c.query(`INSERT INTO quotes (organization_id, contact_id, number, issue_date, expiry_date, currency, exchange_rate, subtotal, tax_total, total, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [orgId, b.contactId, number, b.issueDate, b.expiryDate || addDays(b.issueDate, 30), h.currency, h.exchangeRate, priced.subtotal, priced.taxTotal, priced.total, b.notes || null]);
  await insertLines(c, 'quote_lines', 'quote_id', r.rows[0].id, priced.lines);
  res.status(201).json({ quote: await withLines(c, r.rows[0]) });
}
const transition = (from, to) => async (req, res, c) => {
  const q = (await c.query('SELECT * FROM quotes WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, req.user.orgId])).rows[0];
  if (!q) throw new ApiError(404, 'Quote not found');
  if (q.status !== from) throw new ApiError(409, `Quote must be ${from} (it is ${q.status})`);
  res.json({ quote: await withLines(c, (await c.query('UPDATE quotes SET status=$2 WHERE id=$1 RETURNING *', [q.id, to])).rows[0]) });
};
async function convert(req, res, c) {
  const orgId = req.user.orgId;
  const q = (await c.query('SELECT * FROM quotes WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, orgId])).rows[0];
  if (!q) throw new ApiError(404, 'Quote not found');
  if (q.status === 'CONVERTED') throw new ApiError(409, 'Quote has already been converted to an invoice');
  if (q.status !== 'ACCEPTED') throw new ApiError(409, 'Only accepted quotes can be converted');
  const lines = (await c.query('SELECT * FROM quote_lines WHERE quote_id=$1 ORDER BY id', [q.id])).rows;
  const inv = await createInvoiceRecord(c, orgId, { contactId: q.contact_id, issueDate: today(), dueDate: addDays(today(), await termsDays(c, orgId)), currency: q.currency, exchangeRate: q.exchange_rate, notes: q.notes || `From quote ${q.number}`,
    lines: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unit_price, accountId: l.account_id, taxRateId: l.tax_rate_id })) });
  const nq = (await c.query("UPDATE quotes SET status='CONVERTED', converted_invoice_id=$2 WHERE id=$1 RETURNING *", [q.id, inv.id])).rows[0];
  res.status(201).json({ quote: await withLines(c, nq), invoice: await invoiceWithLines(c, inv) });
}
const send = transition('DRAFT', 'SENT');
const accept = transition('SENT', 'ACCEPTED');
const decline = transition('SENT', 'DECLINED');
export { list, get, create, convert, send, accept, decline };
