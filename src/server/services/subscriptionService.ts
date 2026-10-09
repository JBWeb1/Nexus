import type { Queryable } from '../db';
import { ApiError,money } from '../utils/helpers';
const GRACE_DAYS = 3;
const price = (plan = 'SINGLE') => (plan === 'MULTI' ? Number(process.env.PLAN_PRICE_MULTI_ZAR || 470) : Number(process.env.PLAN_PRICE_ZAR || 250));
const planCode = (plan) => (plan === 'MULTI' ? process.env.PAYSTACK_PLAN_CODE_MULTI : process.env.PAYSTACK_PLAN_CODE);
const planFromCode = (code) => (code && code === process.env.PAYSTACK_PLAN_CODE_MULTI ? 'MULTI' : code && code === process.env.PAYSTACK_PLAN_CODE ? 'SINGLE' : null);
const DAY = 86400000;
const addMonth = (d) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + 1); return x; };

/** What a company is entitled to right now, derived from its stored billing row. Pure, so it is easy to test. */
function entitlement(o, now = new Date(), coveredBy = null) {
  const trialEnd = o.trial_ends_at ? new Date(o.trial_ends_at) : null; const periodEnd = o.current_period_end ? new Date(o.current_period_end) : null;
  const stored = o.subscription_status; let status = stored, entitled = false, endsAt = null;
  if (stored === 'ACTIVE' || stored === 'PAST_DUE') {
    if (periodEnd && now < periodEnd) { status = stored; entitled = true; endsAt = periodEnd; }
    else if (periodEnd && now < new Date(periodEnd.getTime() + GRACE_DAYS * DAY)) { status = 'PAST_DUE'; entitled = true; endsAt = new Date(periodEnd.getTime() + GRACE_DAYS * DAY); }
    else { status = 'EXPIRED'; }
  } else if (stored === 'CANCELLED') {
    if (periodEnd && now < periodEnd) { entitled = true; endsAt = periodEnd; } else status = 'EXPIRED';
  } else { // TRIALING
    if (trialEnd && now < trialEnd) { entitled = true; endsAt = trialEnd; } else status = 'EXPIRED';
  }
  // A paid multi-company plan on another company with the same owner covers this one too.
  if (coveredBy && !(entitled && stored !== 'TRIALING')) { status = 'COVERED'; entitled = true; endsAt = coveredBy.endsAt ? new Date(coveredBy.endsAt) : null; }
  const daysLeft = endsAt ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY)) : 0;
  return { status, entitled, endsAt: endsAt ? endsAt.toISOString() : null, daysLeft, trialEndsAt: trialEnd ? trialEnd.toISOString() : null, currentPeriodEnd: periodEnd ? periodEnd.toISOString() : null, price: price('SINGLE'), multiPrice: price('MULTI'), plan: o.plan || 'SINGLE', coveredBy: status === 'COVERED' ? { id: coveredBy.id, name: coveredBy.name } : null };
}

/** Records a successful subscription charge once (reference is unique) and extends access by a month. */
/** The paid MULTI company (same owner) that covers this one, if any. Works on any connection that can read memberships and organizations. */
async function coverage(db, orgId) {
  const r = (await db.query(`SELECT o2.id, o2.name, o2.current_period_end, o2.subscription_status FROM memberships a JOIN memberships b ON b.user_id=a.user_id AND b.role='OWNER' JOIN organizations o2 ON o2.id=b.organization_id
     WHERE a.organization_id=$1 AND a.role='OWNER' AND o2.id<>$1 AND o2.plan='MULTI'
       AND ((o2.subscription_status IN ('ACTIVE','PAST_DUE') AND o2.current_period_end + interval '${GRACE_DAYS} days' > now()) OR (o2.subscription_status='CANCELLED' AND o2.current_period_end > now()))
     ORDER BY o2.current_period_end DESC LIMIT 1`, [orgId])).rows[0];
  return r ? { id: r.id, name: r.name, endsAt: r.current_period_end } : null;
}
async function activate(c: Pick<Queryable, 'query'>, orgId: string, { reference, amount, paidAt = new Date(), customerCode, plan }: { reference: string; amount: number; paidAt?: Date; customerCode?: string; plan?: string }) {
  const ins = await c.query('INSERT INTO subscription_payments (organization_id, reference, amount, paid_at) VALUES ($1,$2,$3,$4) ON CONFLICT (reference) DO NOTHING RETURNING id', [orgId, reference, money(amount), paidAt]);
  if (!ins.rowCount) return { duplicate: true };
  const o = (await c.query('SELECT current_period_end FROM organizations WHERE id=$1 FOR UPDATE', [orgId])).rows[0]; if (!o) throw new ApiError(404, 'Company not found');
  const base = o.current_period_end && new Date(o.current_period_end) > paidAt ? new Date(o.current_period_end) : new Date(paidAt);
  await c.query("UPDATE organizations SET subscription_status='ACTIVE', current_period_end=$2, paystack_customer_code=COALESCE($3, paystack_customer_code), plan=COALESCE($4, plan) WHERE id=$1", [orgId, addMonth(base), customerCode || null, plan === 'MULTI' || plan === 'SINGLE' ? plan : null]);
  return { duplicate: false };
}
/** subscription.create gives us the codes needed to cancel later. Matched to a company through the Paystack customer code. */
async function attachSubscription(c, { customerCode, subscriptionCode, emailToken }) {
  const r = await c.query('UPDATE organizations SET paystack_subscription_code=$2, paystack_email_token=$3 WHERE paystack_customer_code=$1', [customerCode, subscriptionCode, emailToken]);
  return r.rowCount > 0;
}
async function markBySubscription(c, subscriptionCode, status) { return (await c.query("UPDATE organizations SET subscription_status=$2 WHERE paystack_subscription_code=$1 AND subscription_status <> 'CANCELLED'", [subscriptionCode, status])).rowCount; }
export { coverage, planCode, planFromCode, entitlement, activate, attachSubscription, markBySubscription, price, GRACE_DAYS };
