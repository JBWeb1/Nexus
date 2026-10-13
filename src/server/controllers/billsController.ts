import { ApiError,toCamel,money,addDays } from '../utils/helpers';
import { priceLines,validateHeader,nextNumber,insertLines,termsDays } from '../utils/documents';
import { postJournalEntry,reverseJournalEntry,accountByCode } from '../utils/ledger';

const withLines = async (c, b) => {
  const lines = (await c.query('SELECT bl.*, a.name AS account_name FROM bill_lines bl JOIN accounts a ON a.id=bl.account_id WHERE bl.bill_id=$1 ORDER BY bl.id', [b.id])).rows;
  const contact = (await c.query('SELECT id, name, email, phone FROM contacts WHERE id=$1', [b.contact_id])).rows[0];
  const payments = (await c.query('SELECT * FROM payments WHERE bill_id=$1 ORDER BY date, created_at', [b.id])).rows;
  return toCamel({ ...b, lines, contact, payments });
};
async function list(req, res, c) {
  const r = await c.query(`SELECT b.*, c.name AS contact_name FROM bills b JOIN contacts c ON c.id=b.contact_id WHERE b.organization_id=$1 AND ($2::text IS NULL OR b.status=$2) ORDER BY b.issue_date DESC, b.number DESC`, [req.user.orgId, req.query.status || null]);
  res.json({ bills: toCamel(r.rows) });
}
async function get(req, res, c) {
  const r = await c.query('SELECT * FROM bills WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId]);
  if (!r.rowCount) throw new ApiError(404, 'Bill not found'); res.json({ bill: await withLines(c, r.rows[0]) });
}
async function create(req, res, c) {
  const orgId = req.user.orgId, b = req.body || {};
  const h = validateHeader(b, { dueField: 'dueDate' });
  if (!(await c.query('SELECT 1 FROM contacts WHERE id=$1 AND organization_id=$2', [b.contactId, orgId])).rowCount) throw new ApiError(400, 'Unknown contact');
  const priced = await priceLines(c, orgId, b.lines);
  const number = b.number?.trim() || await nextNumber(c, orgId, 'bills', 'BILL');
  const r = await c.query(`INSERT INTO bills (organization_id, contact_id, number, issue_date, due_date, currency, exchange_rate, subtotal, tax_total, total, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [orgId, b.contactId, number, b.issueDate, b.dueDate || addDays(b.issueDate, await termsDays(c, orgId)), h.currency, h.exchangeRate, priced.subtotal, priced.taxTotal, priced.total, b.notes || null]);
  await insertLines(c, 'bill_lines', 'bill_id', r.rows[0].id, priced.lines);
  res.status(201).json({ bill: await withLines(c, r.rows[0]) });
}
/** Dr expense lines + Dr VAT Input / Cr Accounts Payable. Also used when a receipt is saved as a bill. */
export async function approveBill(c, orgId: string, billId: string, userId: string | null) {
  const bill = (await c.query('SELECT * FROM bills WHERE id=$1 AND organization_id=$2 FOR UPDATE', [billId, orgId])).rows[0];
  if (!bill) throw new ApiError(404, 'Bill not found');
  if (bill.status !== 'DRAFT') throw new ApiError(409, `Bill is already ${bill.status}`);
  if (!(bill.total > 0)) throw new ApiError(400, 'Cannot approve a bill with a zero total');
  const lines = (await c.query('SELECT * FROM bill_lines WHERE bill_id=$1', [bill.id])).rows;
  const debits = new Map(); let vat = 0;
  for (const l of lines) { debits.set(l.account_id, money((debits.get(l.account_id) || 0) + money(l.line_total * bill.exchange_rate))); vat = money(vat + money(l.tax_amount * bill.exchange_rate)); }
  const jl: any[] = [...debits].filter(([, v]) => v > 0).map(([accountId, debit]) => ({ accountId, debit, description: `Bill ${bill.number}`, currency: bill.currency, exchangeRate: bill.exchange_rate }));
  if (vat > 0) jl.push({ accountId: await accountByCode(c, orgId, '2110'), debit: vat, description: `VAT ${bill.number}` });
  const gross = money(jl.reduce((s, l) => s + l.debit, 0));
  jl.push({ accountId: await accountByCode(c, orgId, '2000'), credit: gross, description: `Bill ${bill.number}`, currency: bill.currency, exchangeRate: bill.exchange_rate });
  const je = await postJournalEntry(c, { orgId, date: bill.issue_date, description: `Bill ${bill.number}`, sourceType: 'PURCHASE', sourceTable: 'bills', sourceId: bill.id, lines: jl, createdBy: userId });
  return (await c.query("UPDATE bills SET status='APPROVED', journal_entry_id=$2 WHERE id=$1 RETURNING *", [bill.id, je.id])).rows[0];
}
async function approve(req, res, c) { res.json({ bill: await withLines(c, await approveBill(c, req.user.orgId, req.params.id, req.user.userId)) }); }
async function voidBill(req, res, c) {
  const orgId = req.user.orgId;
  const bill = (await c.query('SELECT * FROM bills WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, orgId])).rows[0];
  if (!bill) throw new ApiError(404, 'Bill not found');
  if (bill.status === 'VOID') throw new ApiError(409, 'Bill is already void');
  if (bill.amount_paid > 0) throw new ApiError(409, 'Reverse the payments before voiding this bill');
  if (bill.journal_entry_id) await reverseJournalEntry(c, { orgId, entryId: bill.journal_entry_id, createdBy: req.user.userId, description: `Void bill ${bill.number}` });
  const r = await c.query("UPDATE bills SET status='VOID' WHERE id=$1 RETURNING *", [bill.id]);
  res.json({ bill: await withLines(c, r.rows[0]) });
}
export { list, get, create, approve, voidBill };
