import crypto from 'crypto';
import { servicePool } from '../db';
import { verifyPaystackTransaction } from '../services/paystackService';
import { recordInvoicePayment } from '../services/paymentsService';
import { today } from '../utils/helpers';
import * as sub from '../services/subscriptionService';

/** POST /webhooks/paystack — body parsed raw so the HMAC is computed over the exact bytes Paystack signed. */
async function paystack(req, res) {
  const secret = process.env.PAYSTACK_SECRET_KEY, sig = req.headers['x-paystack-signature'];
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  if (!secret || !sig) return res.status(401).json({ error: 'Invalid signature' });
  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(sig));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Invalid signature' });
  let evt; try { evt = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ error: 'Bad JSON' }); }
  try {
   const duplicate = await servicePool.tx(async (client) => {
    const eventId = `${evt.event}:${evt.data?.id ?? evt.data?.reference ?? evt.data?.subscription_code ?? evt.data?.subscription?.subscription_code}`;
    const ins = await client.query('INSERT INTO webhook_events (provider, event_id, payload) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id', ['paystack', eventId, evt]);
    if (!ins.rowCount) return true;
    if (evt.event === 'charge.success') {
      const tx = await verifyPaystackTransaction(evt.data.reference); // never trust the webhook body alone
      const m = tx.metadata || {};
      const planCode = tx.plan?.plan_code || tx.plan_object?.plan_code || (typeof tx.plan === 'string' ? tx.plan : null);
      if (tx.status === 'success' && (m.purpose === 'subscription' || (planCode && sub.planFromCode(planCode)))) {
        // First payment carries our org id in metadata; monthly renewals are matched through the Paystack customer code.
        const cust = tx.customer?.customer_code;
        const orgId = m.org_id || (cust ? (await client.query('SELECT id FROM organizations WHERE paystack_customer_code=$1', [cust])).rows[0]?.id : null);
        if (orgId) {
          await sub.activate(client, orgId, { reference: tx.reference, amount: tx.amount / 100, paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(), customerCode: cust, plan: m.plan || sub.planFromCode(planCode) });
          const pending = (await client.query("SELECT payload FROM webhook_events WHERE provider='paystack' AND event_id LIKE 'subscription.create:%' AND payload->'data'->'customer'->>'customer_code'=$1 ORDER BY created_at DESC LIMIT 1", [cust]).catch(() => ({ rows: [] }))).rows[0];
          if (pending) await sub.attachSubscription(client, { customerCode: cust, subscriptionCode: pending.payload.data.subscription_code, emailToken: pending.payload.data.email_token });
        }
      } else if (tx.status === 'success' && m.invoice_id && m.bank_account_id) {
        const inv = (await client.query('SELECT organization_id FROM invoices WHERE id=$1', [m.invoice_id])).rows[0];
        if (inv) {
          await client.query("SELECT set_config('app.current_org', $1, true)", [inv.organization_id]);
          await recordInvoicePayment(client, { orgId: inv.organization_id, invoiceId: m.invoice_id, bankAccountId: m.bank_account_id, amount: tx.amount / 100, feeAmount: (tx.fees || 0) / 100,
            date: today(), reference: tx.reference, gateway: 'paystack', gatewayReference: tx.reference });
        }
      }
    }
    else if (evt.event === 'subscription.create') await sub.attachSubscription(client, { customerCode: evt.data?.customer?.customer_code, subscriptionCode: evt.data?.subscription_code, emailToken: evt.data?.email_token });
    else if (evt.event === 'subscription.disable' || evt.event === 'subscription.not_renew') await sub.markBySubscription(client, evt.data?.subscription_code, 'CANCELLED');
    else if (evt.event === 'invoice.payment_failed') await sub.markBySubscription(client, evt.data?.subscription?.subscription_code, 'PAST_DUE');
    return false;
   });
   res.json(duplicate ? { ok: true, duplicate: true } : { ok: true });
  } catch (e) { res.reset(); console.error('[paystack webhook]', e.message); res.status(500).json({ error: 'Processing failed' }); }
}
const stitch = (req, res) => res.status(501).json({ error: 'Stitch webhooks are not implemented yet' });
function whatsappVerify(req, res) {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': ch } = req.query;
  if (mode === 'subscribe' && process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(ch);
  res.sendStatus(403);
}
async function whatsappEvent(req, res) {
  try {
    const statuses = (req.body?.entry || []).flatMap((e) => (e.changes || []).flatMap((c) => c.value?.statuses || []));
    for (const s of statuses) await servicePool.query('INSERT INTO webhook_events (provider, event_id, payload) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', ['whatsapp', `${s.id}:${s.status}`, s]);
  } catch (e) { console.error('[whatsapp webhook]', e.message); }
  res.sendStatus(200);
}
export { paystack, stitch, whatsappVerify, whatsappEvent };
