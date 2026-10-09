import { runChecks } from './monthEndController';
import { ApiError,newId,toCamel } from '../utils/helpers';
import { signToken } from '../utils/auth'; import { pool } from '../db';
import { seedChartOfAccounts,applyAccountingStyle,TEMPLATES } from '../utils/chart';
const SHAPE = (o, role, active) => ({ id: o.id, name: o.name, role, accountingStyle: o.accounting_style, vatNumber: o.vat_number, active });

/** All companies this user belongs to (identity pool: spans tenants by design). */
async function list(req, res, c) {
  const rows = (await c.query(`SELECT o.*, m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 ORDER BY lower(o.name)`, [req.user.userId])).rows;
  res.json({ companies: rows.map((o) => SHAPE(o, o.role, o.id === req.user.orgId)), styles: Object.entries(TEMPLATES).map(([key, t]) => ({ key, label: t.label, description: t.description })) });
}
async function create(req, res, c) {
  const { name, accountingStyle = 'GENERAL', vatRegistered = false, vatNumber } = req.body || {};
  if (!String(name || '').trim()) throw new ApiError(400, 'Company name is required');
  if (!TEMPLATES[accountingStyle]) throw new ApiError(400, 'Unknown accounting style');
  if (vatNumber && !/^\d{10}$/.test(String(vatNumber).replace(/\s/g, ''))) throw new ApiError(400, 'A South African VAT number has 10 digits');
  const orgId = newId('org');
  // No fresh trial per company: a new company shares the trial clock of the companies this person already owns.
  const trial = (await c.query("SELECT min(o.trial_ends_at) AS t FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.role='OWNER'", [req.user.userId])).rows[0].t;
  await c.query('INSERT INTO organizations (id, name, accounting_style, vat_registered, vat_number, trial_ends_at) VALUES ($1,$2,$3,$4,$5,COALESCE($6, now() + interval \'14 days\'))', [orgId, String(name).trim(), accountingStyle, !!vatRegistered && !!vatNumber, vatRegistered && vatNumber ? String(vatNumber).replace(/\s/g, '') : null, trial]);
  await c.query("INSERT INTO memberships (user_id, organization_id, role) VALUES ($1,$2,'OWNER')", [req.user.userId, orgId]);
  await seedChartOfAccounts(c, orgId); await applyAccountingStyle(c, orgId, accountingStyle);
  await c.query('UPDATE users SET organization_id=$2 WHERE id=$1', [req.user.userId, orgId]);
  const u = (await c.query('SELECT id, name, email FROM users WHERE id=$1', [req.user.userId])).rows[0];
  res.status(201).json({ token: signToken({ id: u.id, organization_id: orgId, role: 'OWNER' }), user: { ...toCamel(u), role: 'OWNER' }, organization: { id: orgId, name: String(name).trim(), currency: 'ZAR' } });
}
async function switchTo(req, res, c) {
  const m = (await c.query('SELECT m.role, o.id, o.name, o.currency FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.organization_id=$2', [req.user.userId, req.params.id])).rows[0];
  if (!m) throw new ApiError(404, 'Company not found');
  await c.query('UPDATE users SET organization_id=$2 WHERE id=$1', [req.user.userId, m.id]);
  const u = (await c.query('SELECT id, name, email FROM users WHERE id=$1', [req.user.userId])).rows[0];
  res.json({ token: signToken({ id: u.id, organization_id: m.id, role: m.role }), user: { ...toCamel(u), role: m.role }, organization: { id: m.id, name: m.name, currency: m.currency } });
}

/** One row of "health" per company the user belongs to: what needs attention across all their clients. Each company is read under its own tenant scope. */
async function overview(req, res, c) {
  const orgs = (await c.query('SELECT o.id, o.name, o.vat_registered, o.accounting_style, m.role FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 ORDER BY lower(o.name)', [req.user.userId])).rows;
  const out = [];
  for (const o of orgs) {
    await pool.tx(async (k) => {
      const one = async (sql) => (await k.query(sql)).rows[0];
      const unmatched = (await one("SELECT count(*)::int AS n FROM bank_transactions WHERE reconciliation_status='UNMATCHED'")).n;
      const od = await one("SELECT count(*)::int AS n, COALESCE(sum(total-amount_paid),0)::float AS amt FROM invoices WHERE status IN ('SENT','PARTIAL') AND due_date < current_date");
      const bd = await one("SELECT count(*)::int AS n, COALESCE(sum(total-amount_paid),0)::float AS amt FROM bills WHERE status IN ('APPROVED','PARTIAL') AND due_date < current_date");
      const drafts = (await one("SELECT ((SELECT count(*) FROM invoices WHERE status='DRAFT') + (SELECT count(*) FROM bills WHERE status='DRAFT'))::int AS n")).n;
      const vat = o.vat_registered ? (await one("SELECT max(period_end) AS d FROM vat_periods WHERE status='FINALIZED'")).d : null;
      const mc = (await one('SELECT max(period) AS p FROM month_closes')).p;
      const rp = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
      const checks = await runChecks(k, o.id, rp); const readiness = Math.round((checks.filter((x) => x.status === 'ok').length / checks.length) * 100);
      out.push({ id: o.id, name: o.name, role: o.role, accountingStyle: o.accounting_style, active: o.id === req.user.orgId, unmatchedBank: unmatched, overdueInvoices: od.n, overdueInvoiceAmount: od.amt, overdueBills: bd.n, overdueBillAmount: bd.amt, drafts, vatRegistered: o.vat_registered, lastVatPeriodEnd: vat ? new Date(vat).toISOString().slice(0, 10) : null, lastClosedMonth: mc || null, attention: unmatched + od.n + bd.n + drafts, readiness, readinessPeriod: rp });
    }, o.id);
  }
  res.json({ companies: out });
}
export { list, create, switchTo, overview };
