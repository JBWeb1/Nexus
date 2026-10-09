import { ApiError,money } from '../utils/helpers';
import { renderDocument } from '../utils/pdf'; import { sendMail } from '../utils/mailer';

async function load(c, orgId, table, linesTable, fk, id) {
  const doc = (await c.query(`SELECT * FROM ${table} WHERE id=$1 AND organization_id=$2`, [id, orgId])).rows[0]; if (!doc) throw new ApiError(404, 'Not found');
  const org = (await c.query('SELECT * FROM organizations WHERE id=$1', [orgId])).rows[0]; const contact = (await c.query('SELECT * FROM contacts WHERE id=$1', [doc.contact_id])).rows[0];
  const lines = (await c.query(`SELECT * FROM ${linesTable} WHERE ${fk}=$1 ORDER BY id`, [doc.id])).rows; return { doc, org, contact, lines };
}
const build = async (c, orgId, kind, id) => {
  const t = kind === 'invoice' ? ['invoices', 'invoice_lines', 'invoice_id'] : ['quotes', 'quote_lines', 'quote_id']; const x = await load(c, orgId, t[0], t[1], t[2], id);
  const buf = await renderDocument(kind === 'invoice' ? { kind: 'Invoice', ...x, dueLabel: 'Due', footer: x.org } : { kind: 'Quote', ...x, dueLabel: 'Valid until', footer: x.org });
  return { ...x, buf };
};
const send = (kind) => async (req, res, c) => { const { doc, buf } = await build(c, req.user.orgId, kind, req.params.id); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${doc.number}.pdf"`); res.send(buf); };
const email = (kind) => async (req, res, c) => {
  const { doc, org, contact, buf } = await build(c, req.user.orgId, kind, req.params.id);
  if (kind === 'invoice' && doc.status === 'DRAFT') throw new ApiError(409, 'Send (post) the invoice first, then email it');
  const to = String(req.body?.to || contact.email || '').trim(); if (!/^\S+@\S+\.\S+$/.test(to)) throw new ApiError(400, 'Add an email address for this customer, or type one in');
  const word = kind === 'invoice' ? 'Invoice' : 'Quote';
  const msg = String(req.body?.message || '').trim() || `Hi ${contact.name},\n\nPlease find ${word.toLowerCase()} ${doc.number} attached.\n${kind === 'invoice' ? `Amount due: ${doc.currency} ${money(doc.total - doc.amount_paid).toFixed(2)}\nDue date: ${String(doc.due_date).slice(0, 10)}\n` : ''}\nKind regards,\n${org.name}`;
  await sendMail({ to, subject: `${word} ${doc.number} from ${org.name}`, text: msg, attachments: [{ filename: `${doc.number}.pdf`, content: buf }] });
  res.json({ ok: true, sentTo: to });
};
/** Creates a Paystack checkout link for what is still owing. The existing webhook records the payment when it succeeds. */
async function payLink(req, res, c) {
  const orgId = req.user.orgId; const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new ApiError(503, 'Online payments are not set up yet. Add PAYSTACK_SECRET_KEY to the server settings.');
  const inv = (await c.query('SELECT * FROM invoices WHERE id=$1 AND organization_id=$2', [req.params.id, orgId])).rows[0]; if (!inv) throw new ApiError(404, 'Invoice not found');
  if (!['SENT', 'PARTIAL'].includes(inv.status)) throw new ApiError(409, 'Only invoices that are owing can have a payment link');
  if (inv.currency !== 'ZAR') throw new ApiError(400, 'Payment links are for rand invoices');
  const bank = (await c.query('SELECT id FROM bank_accounts WHERE organization_id=$1 ORDER BY created_at LIMIT 1', [orgId])).rows[0]; if (!bank) throw new ApiError(400, 'Add a bank account first so payments have somewhere to land');
  const contact = (await c.query('SELECT email FROM contacts WHERE id=$1', [inv.contact_id])).rows[0]; const to = req.body?.email || contact?.email; if (!to) throw new ApiError(400, 'The customer needs an email address for Paystack checkout');
  const owing = money(inv.total - inv.amount_paid);
  const r = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: to, amount: Math.round(owing * 100), currency: 'ZAR', metadata: { invoice_id: inv.id, bank_account_id: bank.id } }) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.status) throw new ApiError(502, `Paystack said: ${j.message || r.status}`);
  res.json({ url: j.data.authorization_url, amount: owing });
}
const invoicePdf = send('invoice');
const quotePdf = send('quote');
const emailInvoice = email('invoice');
const emailQuote = email('quote');
export { payLink, invoicePdf, quotePdf, emailInvoice, emailQuote };
