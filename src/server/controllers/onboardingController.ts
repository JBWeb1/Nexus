import { ApiError,toCamel } from '../utils/helpers';
const TYPES = ['Construction', 'Retail', 'Restaurant / Food', 'Property', 'Freelancer / Consulting', 'Professional services', 'Manufacturing', 'Other'];

import { TEMPLATES,applyAccountingStyle } from '../utils/chart';
const ORG_COLS = 'id, name, currency, vat_number, business_type, vat_registered, accounting_style, vat_cycle, year_end_month, invoice_prefix, bill_prefix, quote_prefix, default_terms_days, registration_number, address, phone, email, bank_details, reminders_enabled, reminder_schedule';
const VAT_CYCLES = [['A', 'Every 2 months (periods end Jan, Mar, May, Jul, Sep, Nov)'], ['B', 'Every 2 months (periods end Feb, Apr, Jun, Aug, Oct, Dec)'], ['C', 'Monthly'], ['D', 'Every 6 months (end Feb and Aug)']];
async function getOrganization(req, res, c) {
  const o = (await c.query(`SELECT ${ORG_COLS} FROM organizations WHERE id=$1`, [req.user.orgId])).rows[0];
  const have = new Set((await c.query('SELECT code FROM accounts WHERE organization_id=$1', [req.user.orgId])).rows.map((r) => r.code));
  const styles = Object.entries(TEMPLATES).map(([key, t]) => ({ key, label: t.label, description: t.description, newAccounts: t.accounts.filter((a) => !have.has(a[0])).map((a) => `${a[0]} ${a[1]}`) }));
  res.json({ organization: toCamel(o), businessTypes: TYPES, styles, vatCycles: VAT_CYCLES.map(([key, label]) => ({ key, label })) });
}
const PREFIX = /^[A-Za-z0-9]{1,8}$/;
async function updateOrganization(req, res, c) {
  const b = req.body || {}; const id = req.user.orgId;
  if (b.name !== undefined && !String(b.name).trim()) throw new ApiError(400, 'Business name cannot be empty');
  if (b.businessType !== undefined && b.businessType !== null && !TYPES.includes(b.businessType)) throw new ApiError(400, 'Unknown business type');
  if (b.vatNumber && !/^\d{10}$/.test(String(b.vatNumber).replace(/\s/g, ''))) throw new ApiError(400, 'A South African VAT number has 10 digits');
  if (b.vatRegistered === true && !b.vatNumber && !(await c.query('SELECT 1 FROM organizations WHERE id=$1 AND vat_number IS NOT NULL', [id])).rowCount) throw new ApiError(400, 'Enter your VAT number to mark the business as VAT-registered');
  if (b.accountingStyle !== undefined && !TEMPLATES[b.accountingStyle]) throw new ApiError(400, 'Unknown accounting style');
  if (b.vatCycle !== undefined && !VAT_CYCLES.some(([k]) => k === b.vatCycle)) throw new ApiError(400, 'Unknown VAT cycle');
  if (b.yearEndMonth !== undefined && !(Number.isInteger(+b.yearEndMonth) && +b.yearEndMonth >= 1 && +b.yearEndMonth <= 12)) throw new ApiError(400, 'Year-end month must be 1 to 12');
  for (const k of ['invoicePrefix', 'billPrefix', 'quotePrefix']) if (b[k] !== undefined && !PREFIX.test(String(b[k]))) throw new ApiError(400, 'Number prefixes use 1 to 8 letters or digits');
  if (b.defaultTermsDays !== undefined && !(Number.isInteger(+b.defaultTermsDays) && +b.defaultTermsDays >= 0 && +b.defaultTermsDays <= 365)) throw new ApiError(400, 'Payment terms must be 0 to 365 days');
  for (const k of ['registrationNumber', 'address', 'phone', 'email', 'bankDetails']) if (b[k] !== undefined && String(b[k]).length > 1000) throw new ApiError(400, 'That field is too long');
  if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) throw new ApiError(400, 'Invalid company email address');
  const set = []; const p = [id]; const add = (col, v) => { p.push(v); set.push(`${col}=$${p.length}`); };
  if (b.name !== undefined) add('name', String(b.name).trim());
  if (b.businessType) add('business_type', b.businessType);
  if (typeof b.vatRegistered === 'boolean') { add('vat_registered', b.vatRegistered); if (b.vatRegistered === false) set.push('vat_number=NULL'); }
  if (b.vatNumber && b.vatRegistered !== false) add('vat_number', String(b.vatNumber).replace(/\s/g, ''));
  if (b.accountingStyle) add('accounting_style', b.accountingStyle);
  if (b.vatCycle) add('vat_cycle', b.vatCycle); if (b.yearEndMonth !== undefined) add('year_end_month', +b.yearEndMonth);
  if (b.invoicePrefix !== undefined) add('invoice_prefix', String(b.invoicePrefix).toUpperCase()); if (b.billPrefix !== undefined) add('bill_prefix', String(b.billPrefix).toUpperCase()); if (b.quotePrefix !== undefined) add('quote_prefix', String(b.quotePrefix).toUpperCase());
  if (b.defaultTermsDays !== undefined) add('default_terms_days', +b.defaultTermsDays);
  if (b.remindersEnabled !== undefined) add('reminders_enabled', b.remindersEnabled === true);
  if (b.reminderSchedule !== undefined) {
    const days: number[] = Array.isArray(b.reminderSchedule) ? [...new Set<number>(b.reminderSchedule.map(Number))].sort((x, y) => x - y) : [];
    if (!days.length || days.length > 6 || days.some((d) => !Number.isInteger(d) || d < -30 || d > 365)) throw new ApiError(400, 'Reminder days must be 1 to 6 whole numbers between -30 (before the due date) and 365');
    add('reminder_schedule', days);
  }
  for (const [k, col] of [['registrationNumber', 'registration_number'], ['address', 'address'], ['phone', 'phone'], ['email', 'email'], ['bankDetails', 'bank_details']]) if (b[k] !== undefined) add(col, String(b[k]).trim() || null);
  let addedAccounts = [];
  if (b.accountingStyle) { const have = new Set((await c.query('SELECT code FROM accounts WHERE organization_id=$1', [id])).rows.map((r) => r.code)); addedAccounts = await applyAccountingStyle(c, id, b.accountingStyle, have); }
  if (set.length) await c.query(`UPDATE organizations SET ${set.join(', ')} WHERE id=$1`, p);
  const o = (await c.query(`SELECT ${ORG_COLS} FROM organizations WHERE id=$1`, [id])).rows[0];
  res.json({ organization: toCamel(o), addedAccounts });
}

/** Setup checklist computed from real data, so it can never drift out of sync with what the user actually did. */
async function checklist(req, res, c) {
  const id = req.user.orgId;
  const q = async (sql) => (await c.query(sql, [id])).rows[0].ok;
  const org = (await c.query('SELECT business_type, vat_registered, vat_number, onboarding_dismissed FROM organizations WHERE id=$1', [id])).rows[0];
  const steps = [
    { key: 'profile', title: 'Set up your business profile', hint: 'Business type and VAT status', link: '/setup', done: !!org.business_type && (!org.vat_registered || !!org.vat_number) },
    { key: 'bank', title: 'Add a bank account', hint: 'Needed to record payments and reconcile', link: '/banking', done: await q('SELECT EXISTS(SELECT 1 FROM bank_accounts WHERE organization_id=$1) AS ok') },
    { key: 'customer', title: 'Add your first customer', hint: 'Who you invoice', link: '/contacts', done: await q("SELECT EXISTS(SELECT 1 FROM contacts WHERE organization_id=$1 AND type IN ('CUSTOMER','BOTH')) AS ok") },
    { key: 'invoice', title: 'Create your first invoice', hint: 'Saved as a draft until you send it', link: '/invoices/new', done: await q('SELECT EXISTS(SELECT 1 FROM invoices WHERE organization_id=$1) AS ok') },
    { key: 'send', title: 'Send your first invoice', hint: 'Posts it to your ledger', link: '/invoices', done: await q("SELECT EXISTS(SELECT 1 FROM invoices WHERE organization_id=$1 AND status<>'DRAFT') AS ok") },
    { key: 'expense', title: 'Record your first expense', hint: 'A supplier bill, or import a spreadsheet', link: '/bills/new', done: await q("SELECT (EXISTS(SELECT 1 FROM bills WHERE organization_id=$1) OR EXISTS(SELECT 1 FROM journal_entries WHERE organization_id=$1 AND source_table='import')) AS ok") },
  ];
  const done = steps.filter((s) => s.done).length;
  res.json({ steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), dismissed: org.onboarding_dismissed });
}
async function dismiss(req, res, c) {
  await c.query('UPDATE organizations SET onboarding_dismissed=$2 WHERE id=$1', [req.user.orgId, req.body?.dismissed !== false]);
  res.json({ ok: true });
}
export { getOrganization, updateOrganization, checklist, dismiss, TYPES };
