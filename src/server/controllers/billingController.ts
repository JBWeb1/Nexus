import { ApiError,toCamel } from '../utils/helpers';
import { entitlement,activate,price,coverage,planCode } from '../services/subscriptionService';
import { verifyPaystackTransaction } from '../services/paystackService';
const own = (req) => req.user.orgId;
const canManage = (req) => ['OWNER', 'ADMIN'].includes(req.user.role);

async function status(req, res, c) {
  const o = (await c.query('SELECT * FROM organizations WHERE id=$1', [own(req)])).rows[0];
  const pays = (await c.query('SELECT reference, amount, paid_at FROM subscription_payments WHERE organization_id=$1 ORDER BY paid_at DESC LIMIT 24', [own(req)])).rows;
  const cov = await coverage(c, own(req)); const e = entitlement(o, new Date(), cov);
  const owned = (await c.query("SELECT count(*)::int AS n FROM memberships b WHERE b.role='OWNER' AND b.user_id IN (SELECT user_id FROM memberships WHERE organization_id=$1 AND role='OWNER')", [own(req)])).rows[0].n;
  res.json({ ...e, storedStatus: o.subscription_status, cancelled: o.subscription_status === 'CANCELLED', canManage: canManage(req), isOwner: req.user.role === 'OWNER', ownedCompanies: owned, plans: [{ key: 'SINGLE', price: price('SINGLE') }, { key: 'MULTI', price: price('MULTI') }], paymentsConfigured: !!process.env.PAYSTACK_SECRET_KEY && !!process.env.PAYSTACK_PLAN_CODE, hasSubscription: !!o.paystack_subscription_code, payments: toCamel(pays) });
}
/** Starts a Paystack checkout on the R250 monthly plan. Paystack charges the card now and every month after. */
async function checkout(req, res, c) {
  if (!canManage(req)) throw new ApiError(403, 'Only an owner or admin can manage billing');
  const which = req.body?.plan === 'MULTI' ? 'MULTI' : 'SINGLE'; const key = process.env.PAYSTACK_SECRET_KEY, plan = planCode(which);
  if (!key || !plan) throw new ApiError(503, `Subscriptions are not switched on for this server yet. Set PAYSTACK_SECRET_KEY and ${which === 'MULTI' ? 'PAYSTACK_PLAN_CODE_MULTI' : 'PAYSTACK_PLAN_CODE'} (a monthly plan created in your Paystack dashboard).`);
  const cur = (await c.query('SELECT paystack_subscription_code, paystack_email_token, plan, subscription_status FROM organizations WHERE id=$1', [own(req)])).rows[0];
  // Changing plan: stop the old Paystack subscription first so the customer is never charged for both.
  if (cur.paystack_subscription_code && cur.paystack_email_token && cur.plan !== which && ['ACTIVE', 'PAST_DUE'].includes(cur.subscription_status)) {
    const d = await fetch('https://api.paystack.co/subscription/disable', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: cur.paystack_subscription_code, token: cur.paystack_email_token }) }).then((x) => x.json()).catch(() => ({}));
    if (!d.status) throw new ApiError(502, 'We could not stop your current plan with Paystack, so nothing was changed. Try again in a moment.');
    await c.query('UPDATE organizations SET paystack_subscription_code=NULL, paystack_email_token=NULL WHERE id=$1', [own(req)]);
  }
  const u = (await c.query('SELECT email FROM users WHERE id=$1', [req.user.userId])).rows[0];
  const r = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, amount: Math.round(price(which) * 100), currency: 'ZAR', plan, callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/billing`, metadata: { purpose: 'subscription', org_id: own(req), plan: which } }) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.status) throw new ApiError(502, `Paystack said: ${j.message || r.status}`);
  res.json({ url: j.data.authorization_url, reference: j.data.reference });
}
/** After Paystack sends the customer back, confirm the payment directly instead of waiting for the webhook. */
async function verify(req, res, c) {
  const ref = String(req.query.reference || req.body?.reference || ''); if (!ref) throw new ApiError(400, 'Missing payment reference');
  let tx; try { tx = await verifyPaystackTransaction(ref); } catch (e) { throw new ApiError(502, 'We could not confirm that payment with Paystack yet. If you were charged, access switches on within a few minutes.'); }
  const m = tx.metadata || {};
  if (tx.status !== 'success') throw new ApiError(402, 'That payment was not completed');
  if (m.purpose !== 'subscription' || m.org_id !== own(req)) throw new ApiError(403, 'That payment belongs to a different company');
  await activate(c, own(req), { reference: tx.reference, amount: tx.amount / 100, paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(), customerCode: tx.customer?.customer_code, plan: m.plan });
  res.json({ ok: true });
}
/** Stops future charges. Access continues until the end of the month already paid for. */
async function cancel(req, res, c) {
  if (req.user.role !== 'OWNER') throw new ApiError(403, 'Only the owner can cancel the subscription');
  const o = (await c.query('SELECT paystack_subscription_code, paystack_email_token, subscription_status FROM organizations WHERE id=$1 FOR UPDATE', [own(req)])).rows[0];
  if (o.subscription_status !== 'ACTIVE' && o.subscription_status !== 'PAST_DUE') throw new ApiError(409, 'There is no active subscription to cancel');
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (o.paystack_subscription_code && o.paystack_email_token) {
    if (!key) throw new ApiError(503, 'Online payments are not set up on this server');
    const r = await fetch('https://api.paystack.co/subscription/disable', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: o.paystack_subscription_code, token: o.paystack_email_token }) });
    const j = await r.json().catch(() => ({})); if (!r.ok || !j.status) throw new ApiError(502, `Paystack said: ${j.message || r.status}`);
  }
  await c.query("UPDATE organizations SET subscription_status='CANCELLED' WHERE id=$1", [own(req)]);
  res.json({ ok: true });
}
export { status, checkout, verify, cancel };
