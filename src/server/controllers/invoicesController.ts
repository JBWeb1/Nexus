import { ApiError,toCamel,money,today,addDays } from '../utils/helpers';
import { priceLines,validateHeader,nextNumber,insertLines,termsDays } from '../utils/documents';
import { postJournalEntry,reverseJournalEntry,accountByCode } from '../utils/ledger';
import { notifyInvoiceSent } from '../services/whatsappService';

const withLines = async (c, inv) => {
  const lines = (await c.query('SELECT il.*, a.name AS account_name FROM invoice_lines il JOIN accounts a ON a.id=il.account_id WHERE il.invoice_id=$1 ORDER BY il.id', [inv.id])).rows;
  const contact = (await c.query('SELECT id, name, email, phone FROM contacts WHERE id=$1', [inv.contact_id])).rows[0];
  const payments = (await c.query("SELECT * FROM payments WHERE invoice_id=$1 ORDER BY date, created_at", [inv.id])).rows;
  return toCamel({ ...inv, lines, contact, payments });
};
async function list(req, res, c) {
  const r = await c.query(`SELECT i.*, c.name AS contact_name FROM invoices i JOIN contacts c ON c.id=i.contact_id
     WHERE i.organization_id=$1 AND ($2::text IS NULL OR i.status=$2) ORDER BY i.issue_date DESC, i.number DESC`, [req.user.orgId, req.query.status || null]);
  res.json({ invoices: toCamel(r.rows) });
}
async function get(req, res, c) {
  const r = await c.query('SELECT * FROM invoices WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId]);
  if (!r.rowCount) throw new ApiError(404, 'Invoice not found'); res.json({ invoice: await withLines(c, r.rows[0]) });
}
async function createInvoiceRecord(c, orgId, b) {
  const h = validateHeader(b, { dueField: 'dueDate' });
  const contact = await c.query('SELECT 1 FROM contacts WHERE id=$1 AND organization_id=$2', [b.contactId, orgId]);
  if (!contact.rowCount) throw new ApiError(400, 'Unknown contact');
  const priced = await priceLines(c, orgId, b.lines);
  const due = b.dueDate || addDays(b.issueDate, await termsDays(c, orgId));
  if (due < b.issueDate) throw new ApiError(400, 'Due date cannot be before the issue date');
  const number = await nextNumber(c, orgId, 'invoices', 'INV');
  const r = await c.query(`INSERT INTO invoices (organization_id, contact_id, number, issue_date, due_date, currency, exchange_rate, subtotal, tax_total, total, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [orgId, b.contactId, number, b.issueDate, due, h.currency, h.exchangeRate, priced.subtotal, priced.taxTotal, priced.total, b.notes || null]);
  await insertLines(c, 'invoice_lines', 'invoice_id', r.rows[0].id, priced.lines);
  return r.rows[0];
}
async function create(req, res, c) { const inv = await createInvoiceRecord(c, req.user.orgId, req.body || {}); res.status(201).json({ invoice: await withLines(c, inv) }); }
async function update(req, res, c) {
  const inv = (await c.query('SELECT * FROM invoices WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, req.user.orgId])).rows[0];
  if (!inv) throw new ApiError(404, 'Invoice not found');
  if (inv.status !== 'DRAFT') throw new ApiError(409, 'Only draft invoices can be edited');
  const b = { ...inv, contactId: inv.contact_id, issueDate: inv.issue_date, dueDate: inv.due_date, exchangeRate: inv.exchange_rate, ...(req.body || {}) };
  const h = validateHeader(b, { dueField: 'dueDate' });
  let priced = null;
  if (req.body?.lines) { priced = await priceLines(c, req.user.orgId, req.body.lines); await c.query('DELETE FROM invoice_lines WHERE invoice_id=$1', [inv.id]); await insertLines(c, 'invoice_lines', 'invoice_id', inv.id, priced.lines); }
  const r = await c.query(`UPDATE invoices SET contact_id=$2, issue_date=$3, due_date=$4, currency=$5, exchange_rate=$6, notes=$7,
      subtotal=COALESCE($8,subtotal), tax_total=COALESCE($9,tax_total), total=COALESCE($10,total) WHERE id=$1 RETURNING *`,
    [inv.id, b.contactId, b.issueDate, b.dueDate, h.currency, h.exchangeRate, b.notes ?? null, priced?.subtotal ?? null, priced?.taxTotal ?? null, priced?.total ?? null]);
  res.json({ invoice: await withLines(c, r.rows[0]) });
}
/** Posts the sale: Dr AR (gross) / Cr revenue (per line) / Cr VAT Output. Amounts converted to base currency. */
async function send(req, res, c) {
  const orgId = req.user.orgId;
  const inv = (await c.query('SELECT * FROM invoices WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, orgId])).rows[0];
  if (!inv) throw new ApiError(404, 'Invoice not found');
  if (inv.status !== 'DRAFT') throw new ApiError(409, `Invoice is already ${inv.status}`);
  if (!(inv.total > 0)) throw new ApiError(400, 'Cannot send an invoice with a zero total');
  const lines = (await c.query('SELECT * FROM invoice_lines WHERE invoice_id=$1', [inv.id])).rows;
  const credits = new Map(); let vat = 0;
  for (const l of lines) { credits.set(l.account_id, money((credits.get(l.account_id) || 0) + money(l.line_total * inv.exchange_rate))); vat = money(vat + money(l.tax_amount * inv.exchange_rate)); }
  const jl: any[] = [...credits].filter(([, v]) => v > 0).map(([accountId, credit]) => ({ accountId, credit, description: `Invoice ${inv.number}`, currency: inv.currency, exchangeRate: inv.exchange_rate }));
  if (vat > 0) jl.push({ accountId: await accountByCode(c, orgId, '2100'), credit: vat, description: `VAT ${inv.number}` });
  const gross = money(jl.reduce((s, l) => s + l.credit, 0));
  jl.unshift({ accountId: await accountByCode(c, orgId, '1100'), debit: gross, description: `Invoice ${inv.number}`, currency: inv.currency, exchangeRate: inv.exchange_rate });
  const je = await postJournalEntry(c, { orgId, date: inv.issue_date, description: `Invoice ${inv.number}`, sourceType: 'SALES', sourceTable: 'invoices', sourceId: inv.id, lines: jl, createdBy: req.user.userId });
  const r = await c.query("UPDATE invoices SET status='SENT', journal_entry_id=$2 WHERE id=$1 RETURNING *", [inv.id, je.id]);
  const contact = (await c.query('SELECT name, phone FROM contacts WHERE id=$1', [inv.contact_id])).rows[0];
  notifyInvoiceSent(contact, r.rows[0]).catch(() => {});
  res.json({ invoice: await withLines(c, r.rows[0]) });
}
async function voidInvoice(req, res, c) {
  const orgId = req.user.orgId;
  const inv = (await c.query('SELECT * FROM invoices WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, orgId])).rows[0];
  if (!inv) throw new ApiError(404, 'Invoice not found');
  if (inv.status === 'VOID') throw new ApiError(409, 'Invoice is already void');
  if (inv.status === 'PAID' || inv.status === 'PARTIAL' || inv.amount_paid > 0) throw new ApiError(409, 'Reverse the payments before voiding this invoice');
  if (inv.journal_entry_id) await reverseJournalEntry(c, { orgId, entryId: inv.journal_entry_id, createdBy: req.user.userId, description: `Void invoice ${inv.number}` });
  const r = await c.query("UPDATE invoices SET status='VOID' WHERE id=$1 RETURNING *", [inv.id]);
  res.json({ invoice: await withLines(c, r.rows[0]) });
}
export { list, get, create, update, send, voidInvoice, createInvoiceRecord, withLines };
