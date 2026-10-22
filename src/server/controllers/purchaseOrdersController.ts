/**
 * Purchase orders: what was ordered from a supplier. Nothing is posted to the ledger; when the supplier's invoice arrives
 * the order becomes a draft bill with the same lines, which is checked and approved as usual.
 */
import { ApiError, toCamel, addDays, today, isDate } from '../utils/helpers';
import { priceLines, validateHeader, nextNumber, insertLines, termsDays, rawLine } from '../utils/documents';

const withLines = async (c, po) => {
  const lines = (await c.query(`SELECT l.*, a.name AS account_name, it.code AS item_code, p.name AS project_name FROM purchase_order_lines l JOIN accounts a ON a.id=l.account_id
      LEFT JOIN items it ON it.id=l.item_id LEFT JOIN projects p ON p.id=l.project_id WHERE l.purchase_order_id=$1 ORDER BY l.line_no`, [po.id])).rows;
  const contact = (await c.query('SELECT id, name, email, phone FROM contacts WHERE id=$1', [po.contact_id])).rows[0];
  const bill = po.bill_id ? (await c.query('SELECT id, number, status FROM bills WHERE id=$1', [po.bill_id])).rows[0] : null;
  return toCamel({ ...po, lines, contact, bill });
};
async function list(req, res, c) {
  const r = await c.query(`SELECT po.*, c.name AS contact_name FROM purchase_orders po JOIN contacts c ON c.id=po.contact_id
     WHERE po.organization_id=$1 AND ($2::text IS NULL OR po.status=$2) ORDER BY po.issue_date DESC, po.number DESC`, [req.user.orgId, req.query.status || null]);
  res.json({ purchaseOrders: toCamel(r.rows) });
}
async function load(c, orgId, id, lock = false) {
  const po = (await c.query(`SELECT * FROM purchase_orders WHERE id=$1 AND organization_id=$2${lock ? ' FOR UPDATE' : ''}`, [id, orgId])).rows[0];
  if (!po) throw new ApiError(404, 'Purchase order not found'); return po;
}
async function get(req, res, c) { res.json({ purchaseOrder: await withLines(c, await load(c, req.user.orgId, req.params.id)) }); }
async function create(req, res, c) {
  const orgId = req.user.orgId, b = req.body || {}; const h = validateHeader(b, { dueField: 'deliveryDate' });
  if (b.deliveryDate && b.deliveryDate < b.issueDate) throw new ApiError(400, 'The delivery date cannot be before the order date');
  if (!(await c.query('SELECT 1 FROM contacts WHERE id=$1 AND organization_id=$2', [b.contactId, orgId])).rowCount) throw new ApiError(400, 'Unknown supplier');
  const priced = await priceLines(c, orgId, b.lines, { side: 'purchase' }); const number = await nextNumber(c, orgId, 'purchase_orders', 'PO');
  const r = await c.query(`INSERT INTO purchase_orders (organization_id, contact_id, number, issue_date, delivery_date, currency, exchange_rate, subtotal, tax_total, total, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [orgId, b.contactId, number, b.issueDate, b.deliveryDate || null, h.currency, h.exchangeRate, priced.subtotal, priced.taxTotal, priced.total, b.notes || null]);
  await insertLines(c, 'purchase_order_lines', 'purchase_order_id', r.rows[0].id, priced.lines);
  res.status(201).json({ purchaseOrder: await withLines(c, r.rows[0]) });
}
const transition = (from: string[], to: string) => async (req, res, c) => {
  const po = await load(c, req.user.orgId, req.params.id, true);
  if (!from.includes(po.status)) throw new ApiError(409, `This purchase order is ${po.status.toLowerCase()}`);
  res.json({ purchaseOrder: await withLines(c, (await c.query('UPDATE purchase_orders SET status=$2 WHERE id=$1 RETURNING *', [po.id, to])).rows[0]) });
};
/** The supplier's invoice has arrived: a draft bill with the order's lines, to check against the invoice and approve. */
async function convert(req, res, c) {
  const orgId = req.user.orgId; const po = await load(c, orgId, req.params.id, true);
  if (po.status === 'BILLED') throw new ApiError(409, 'This purchase order already has a bill');
  if (po.status === 'CANCELLED') throw new ApiError(409, 'This purchase order was cancelled');
  const issueDate = req.body?.issueDate ?? today(); if (!isDate(issueDate)) throw new ApiError(400, 'Enter the date on the supplier\'s invoice');
  const lines = (await c.query('SELECT * FROM purchase_order_lines WHERE purchase_order_id=$1 ORDER BY line_no', [po.id])).rows;
  const priced = await priceLines(c, orgId, lines.map(rawLine), { side: 'purchase' });
  const ref = String(req.body?.supplierReference || '').trim().slice(0, 60);
  const number = ref && !(await c.query('SELECT 1 FROM bills WHERE organization_id=$1 AND number=$2', [orgId, ref])).rowCount ? ref : await nextNumber(c, orgId, 'bills', 'BILL');
  const bill = (await c.query(`INSERT INTO bills (organization_id, contact_id, number, issue_date, due_date, currency, exchange_rate, subtotal, tax_total, total, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [orgId, po.contact_id, number, issueDate, addDays(issueDate, await termsDays(c, orgId)), po.currency, po.exchange_rate, priced.subtotal, priced.taxTotal, priced.total, `From purchase order ${po.number}${po.notes ? `\n${po.notes}` : ''}`])).rows[0];
  await insertLines(c, 'bill_lines', 'bill_id', bill.id, priced.lines);
  const npo = (await c.query("UPDATE purchase_orders SET status='BILLED', bill_id=$2 WHERE id=$1 RETURNING *", [po.id, bill.id])).rows[0];
  res.status(201).json({ purchaseOrder: await withLines(c, npo), bill: toCamel(bill) });
}
const send = transition(['DRAFT'], 'SENT');
const cancel = transition(['DRAFT', 'SENT'], 'CANCELLED');
export { list, get, create, send, cancel, convert };
