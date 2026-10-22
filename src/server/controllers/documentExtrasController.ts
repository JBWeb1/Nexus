import { ApiError,money } from '../utils/helpers';
import { renderDocument } from '../utils/pdf'; import { sendMail } from '../utils/mailer';

async function load(c, orgId, table, linesTable, fk, id) {
  const doc = (await c.query(`SELECT * FROM ${table} WHERE id=$1 AND organization_id=$2`, [id, orgId])).rows[0]; if (!doc) throw new ApiError(404, 'Not found');
  const org = (await c.query('SELECT * FROM organizations WHERE id=$1', [orgId])).rows[0]; const contact = (await c.query('SELECT * FROM contacts WHERE id=$1', [doc.contact_id])).rows[0];
  const lines = (await c.query(`SELECT * FROM ${linesTable} WHERE ${fk}=$1 ORDER BY line_no`, [doc.id])).rows; return { doc, org, contact, lines };
}
const TABLES = { invoice: ['invoices', 'invoice_lines', 'invoice_id'], quote: ['quotes', 'quote_lines', 'quote_id'], po: ['purchase_orders', 'purchase_order_lines', 'purchase_order_id'] };
const build = async (c, orgId, kind, id) => {
  const t = TABLES[kind]; const x = await load(c, orgId, t[0], t[1], t[2], id);
  const buf = await renderDocument(kind === 'invoice' ? { kind: 'Invoice', ...x, dueLabel: 'Due', footer: x.org }
    : kind === 'quote' ? { kind: 'Quote', ...x, dueLabel: 'Valid until', footer: x.org }
    // A purchase order goes to the supplier: no banking details, and the delivery date in place of a due date.
    : { kind: 'Purchase order', ...x, doc: { ...x.doc, due_date: x.doc.delivery_date }, dueLabel: 'Deliver by', toLabel: 'SUPPLIER', footer: null });
  return { ...x, buf };
};
const send = (kind) => async (req, res, c) => { const { doc, buf } = await build(c, req.user.orgId, kind, req.params.id); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${doc.number}.pdf"`); res.send(buf); };
const email = (kind) => async (req, res, c) => {
  const { doc, org, contact, buf } = await build(c, req.user.orgId, kind, req.params.id);
  if (kind === 'invoice' && doc.status === 'DRAFT') throw new ApiError(409, 'Send (post) the invoice first, then email it');
  if (kind === 'po' && doc.status === 'CANCELLED') throw new ApiError(409, 'This purchase order was cancelled');
  const to = String(req.body?.to || contact.email || '').trim(); if (!/^\S+@\S+\.\S+$/.test(to)) throw new ApiError(400, `Add an email address for this ${kind === 'po' ? 'supplier' : 'customer'}, or type one in`);
  const word = { invoice: 'Invoice', quote: 'Quote', po: 'Purchase order' }[kind];
  const detail = kind === 'invoice' ? `Amount due: ${doc.currency} ${money(doc.total - doc.amount_paid).toFixed(2)}\nDue date: ${String(doc.due_date).slice(0, 10)}\n`
    : kind === 'po' ? `${doc.delivery_date ? `Please deliver by ${String(doc.delivery_date).slice(0, 10)}. ` : ''}Please quote ${doc.number} on your invoice.\n` : '';
  const msg = String(req.body?.message || '').trim() || `Hi ${contact.name},\n\nPlease find ${word.toLowerCase()} ${doc.number} attached.\n${detail}\nKind regards,\n${org.name}`;
  await sendMail({ to, subject: `${word} ${doc.number} from ${org.name}`, text: msg, attachments: [{ filename: `${doc.number}.pdf`, content: buf }] });
  // Emailing a draft order to the supplier is sending it.
  if (kind === 'po' && doc.status === 'DRAFT') await c.query("UPDATE purchase_orders SET status='SENT' WHERE id=$1", [doc.id]);
  res.json({ ok: true, sentTo: to });
};
/** A Paystack checkout link for what is still owing on an invoice. The existing webhook records the payment when it succeeds. */
export async function invoicePayLink(c, orgId: string, invoiceId: string, email?: string) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new ApiError(503, 'Online payments are not set up yet. Add PAYSTACK_SECRET_KEY to the server settings.');
  const inv = (await c.query('SELECT * FROM invoices WHERE id=$1 AND organization_id=$2', [invoiceId, orgId])).rows[0]; if (!inv) throw new ApiError(404, 'Invoice not found');
  if (!['SENT', 'PARTIAL'].includes(inv.status)) throw new ApiError(409, 'Only invoices that are owing can have a payment link');
  if (inv.currency !== 'ZAR') throw new ApiError(400, 'Payment links are for rand invoices');
  const bank = (await c.query('SELECT id FROM bank_accounts WHERE organization_id=$1 ORDER BY created_at LIMIT 1', [orgId])).rows[0]; if (!bank) throw new ApiError(400, 'Add a bank account first so payments have somewhere to land');
  const contact = (await c.query('SELECT email FROM contacts WHERE id=$1', [inv.contact_id])).rows[0]; const to = email || contact?.email; if (!to) throw new ApiError(400, 'The customer needs an email address for Paystack checkout');
  const owing = money(inv.total - inv.amount_paid);
  const r = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: to, amount: Math.round(owing * 100), currency: 'ZAR', metadata: { invoice_id: inv.id, bank_account_id: bank.id } }) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.status) throw new ApiError(502, `Paystack said: ${j.message || r.status}`);
  return { url: j.data.authorization_url, amount: owing };
}
async function payLink(req, res, c) { res.json(await invoicePayLink(c, req.user.orgId, req.params.id, req.body?.email)); }
/** The invoice PDF, for use outside a request (reminders, the customer portal). */
export const invoicePdfBuffer = async (c, orgId: string, invoiceId: string) => (await build(c, orgId, 'invoice', invoiceId));
const invoicePdf = send('invoice');
const quotePdf = send('quote');
const emailInvoice = email('invoice');
const emailQuote = email('quote');
const purchaseOrderPdf = send('po');
const emailPurchaseOrder = email('po');
export { payLink, invoicePdf, quotePdf, emailInvoice, emailQuote, purchaseOrderPdf, emailPurchaseOrder };
