import { ApiError,toCamel,money,today,isDate } from '../utils/helpers';
import { priceLines,nextNumber,insertLines } from '../utils/documents';
import { postJournalEntry,reverseJournalEntry,accountByCode } from '../utils/ledger';
import { invoiceStatusFor } from '../services/paymentsService';
import { renderDocument } from '../utils/pdf';

async function withLines(c, n) { const lines = (await c.query('SELECT * FROM credit_note_lines WHERE credit_note_id=$1 ORDER BY id', [n.id])).rows; return toCamel({ ...n, lines }); }
async function list(req, res, c) {
  const p = [req.user.orgId]; let w = 'n.organization_id=$1'; if (req.query.invoiceId) { p.push(req.query.invoiceId); w += ` AND n.invoice_id=$${p.length}`; }
  const r = await c.query(`SELECT n.*, c.name AS contact_name, i.number AS invoice_number FROM credit_notes n JOIN contacts c ON c.id=n.contact_id JOIN invoices i ON i.id=n.invoice_id WHERE ${w} ORDER BY n.issue_date DESC, n.number DESC`, p);
  res.json({ creditNotes: toCamel(r.rows) });
}
async function get(req, res, c) {
  const n = (await c.query('SELECT n.*, c.name AS contact_name, i.number AS invoice_number FROM credit_notes n JOIN contacts c ON c.id=n.contact_id JOIN invoices i ON i.id=n.invoice_id WHERE n.id=$1 AND n.organization_id=$2', [req.params.id, req.user.orgId])).rows[0];
  if (!n) throw new ApiError(404, 'Credit note not found'); res.json({ creditNote: await withLines(c, n) });
}
/** Dr revenue (per line) + Dr VAT Output / Cr Accounts Receivable. Reduces what the invoice owes; the invoice itself is never edited. */
async function create(req, res, c) {
  const orgId = req.user.orgId; const b = req.body || {};
  const inv = (await c.query('SELECT * FROM invoices WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, orgId])).rows[0];
  if (!inv) throw new ApiError(404, 'Invoice not found');
  if (!['SENT', 'PARTIAL'].includes(inv.status)) throw new ApiError(409, inv.status === 'PAID' ? 'This invoice is fully paid. Reverse the payment first, then credit it.' : `Cannot credit a ${inv.status} invoice`);
  const date = b.issueDate || today(); if (!isDate(date)) throw new ApiError(400, 'Valid date required');
  let raw = b.lines;
  if (!raw || (Array.isArray(raw) && raw.length === 0)) {
    if (!b.full) throw new ApiError(400, 'Add the lines to credit, or choose a full credit');
    if (inv.amount_paid > 0) throw new ApiError(400, 'A full credit is only possible while nothing has been paid or credited. Enter the lines to credit instead.');
    raw = (await c.query('SELECT description, quantity, unit_price, account_id, tax_rate_id FROM invoice_lines WHERE invoice_id=$1', [inv.id])).rows.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unit_price, accountId: l.account_id, taxRateId: l.tax_rate_id }));
  }
  const priced = await priceLines(c, orgId, raw); const outstanding = money(inv.total - inv.amount_paid);
  if (priced.total > outstanding + 0.005) throw new ApiError(400, `A credit note cannot be more than the amount still owing (${outstanding})`);
  const number = await nextNumber(c, orgId, 'credit_notes', 'CN');
  const n = (await c.query(`INSERT INTO credit_notes (organization_id, invoice_id, contact_id, number, issue_date, reason, currency, exchange_rate, subtotal, tax_total, total, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [orgId, inv.id, inv.contact_id, number, date, b.reason?.trim() || null, inv.currency, inv.exchange_rate, priced.subtotal, priced.taxTotal, priced.total, req.user.userId])).rows[0];
  await insertLines(c, 'credit_note_lines', 'credit_note_id', n.id, priced.lines);
  const debits = new Map(); let vat = 0;
  for (const l of priced.lines) { debits.set(l.accountId, money((debits.get(l.accountId) || 0) + money(l.lineTotal * inv.exchange_rate))); vat = money(vat + money(l.taxAmount * inv.exchange_rate)); }
  const jl: any[] = [...debits].filter(([, v]) => v > 0).map(([accountId, debit]) => ({ accountId, debit, description: `Credit note ${number}`, currency: inv.currency, exchangeRate: inv.exchange_rate }));
  if (vat > 0) jl.push({ accountId: await accountByCode(c, orgId, '2100'), debit: vat, description: `VAT ${number}` });
  const gross = money(jl.reduce((s, l) => s + l.debit, 0));
  jl.push({ accountId: await accountByCode(c, orgId, '1100'), credit: gross, description: `Credit note ${number} against ${inv.number}`, currency: inv.currency, exchangeRate: inv.exchange_rate });
  const je = await postJournalEntry(c, { orgId, date, description: `Credit note ${number} (${inv.number})`, sourceType: 'SALES', sourceTable: 'credit_notes', sourceId: n.id, lines: jl, createdBy: req.user.userId });
  await c.query('UPDATE credit_notes SET journal_entry_id=$2 WHERE id=$1', [n.id, je.id]);
  const paid = money(inv.amount_paid + priced.total), credit = money(inv.credit_total + priced.total);
  await c.query('UPDATE invoices SET amount_paid=$2, credit_total=$3, status=$4 WHERE id=$1', [inv.id, paid, credit, invoiceStatusFor(inv.total, paid, credit)]);
  res.status(201).json({ creditNote: await withLines(c, { ...n, journal_entry_id: je.id }) });
}
async function voidNote(req, res, c) {
  const orgId = req.user.orgId; const n = (await c.query('SELECT * FROM credit_notes WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, orgId])).rows[0];
  if (!n) throw new ApiError(404, 'Credit note not found'); if (n.status === 'VOID') throw new ApiError(409, 'Already void');
  await reverseJournalEntry(c, { orgId, entryId: n.journal_entry_id, createdBy: req.user.userId, description: `Void credit note ${n.number}` });
  const inv = (await c.query('SELECT * FROM invoices WHERE id=$1 FOR UPDATE', [n.invoice_id])).rows[0];
  const paid = Math.max(0, money(inv.amount_paid - n.total)), credit = Math.max(0, money(inv.credit_total - n.total));
  await c.query('UPDATE invoices SET amount_paid=$2, credit_total=$3, status=$4 WHERE id=$1', [inv.id, paid, credit, invoiceStatusFor(inv.total, paid, credit)]);
  const r = await c.query("UPDATE credit_notes SET status='VOID' WHERE id=$1 RETURNING *", [n.id]); res.json({ creditNote: await withLines(c, r.rows[0]) });
}
async function pdf(req, res, c) {
  const orgId = req.user.orgId; const n = (await c.query('SELECT * FROM credit_notes WHERE id=$1 AND organization_id=$2', [req.params.id, orgId])).rows[0]; if (!n) throw new ApiError(404, 'Credit note not found');
  const org = (await c.query('SELECT * FROM organizations WHERE id=$1', [orgId])).rows[0]; const contact = (await c.query('SELECT * FROM contacts WHERE id=$1', [n.contact_id])).rows[0];
  const inv = (await c.query('SELECT number FROM invoices WHERE id=$1', [n.invoice_id])).rows[0]; const lines = (await c.query('SELECT * FROM credit_note_lines WHERE credit_note_id=$1', [n.id])).rows;
  const buf = await renderDocument({ kind: 'Credit note', org, contact, doc: n, lines, extra: [`Against invoice ${inv.number}`], footer: org });
  res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${n.number}.pdf"`); res.send(buf);
}
export { list, get, create, voidNote, pdf };
