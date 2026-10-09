// Outbound WhatsApp via Meta Graph API. All functions are no-ops unless WHATSAPP_ACCESS_TOKEN is set. Never throws.
async function sendWhatsApp(to, template, params = []) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN, phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !to) return { skipped: true };
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: String(to).replace(/[^\d]/g, ''), type: 'template',
        template: { name: template, language: { code: 'en' }, components: [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p) })) }] } }),
    });
    return { ok: res.ok };
  } catch (e) { console.error('[whatsapp]', e.message); return { ok: false }; }
}
const fmt = (n, c = 'ZAR') => `${c} ${Number(n).toFixed(2)}`;
const notify = {
  notifyInvoiceSent: (contact, inv) => sendWhatsApp(contact?.phone, 'invoice_sent', [contact?.name, inv.number, fmt(inv.total, inv.currency), inv.due_date]),
  notifyPaymentReceived: (contact, inv, amount) => sendWhatsApp(contact?.phone, 'payment_received', [contact?.name, inv.number, fmt(amount, inv.currency)]),
  notifyInvoiceOverdue: (contact, inv) => sendWhatsApp(contact?.phone, 'invoice_overdue', [contact?.name, inv.number, fmt(inv.total - inv.amount_paid, inv.currency)]),
};
export const { notifyInvoiceSent, notifyPaymentReceived, notifyInvoiceOverdue } = notify as any;
export { sendWhatsApp };
