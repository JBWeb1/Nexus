import { ApiError,isDate,money,today } from '../utils/helpers';
import { getAccountBalances } from '../utils/ledger';
import { toCamel } from '../utils/helpers';
import { booksHealth } from '../services/booksHealthService';
const strip = (a) => ({ id: a.id, code: a.code, name: a.name, type: a.type });

async function trialBalance(req, res, c) {
  const asOf = req.query.asOf || today(); if (!isDate(asOf)) throw new ApiError(400, 'Invalid asOf date');
  const rows = (await getAccountBalances(c, req.user.orgId, { to: asOf })).filter((a) => a.debit || a.credit)
    .map((a) => ({ ...strip(a), debit: a.balance > 0 ? a.balance : 0, credit: a.balance < 0 ? -a.balance : 0 }));
  const td = money(rows.reduce((s, r) => s + r.debit, 0)), tc = money(rows.reduce((s, r) => s + r.credit, 0));
  res.json({ asOf, rows, totalDebit: td, totalCredit: tc, balanced: td === tc });
}
async function profitAndLoss(req, res, c) {
  const to = req.query.to || today(), from = req.query.from || `${to.slice(0, 4)}-01-01`;
  if (!isDate(from) || !isDate(to)) throw new ApiError(400, 'Invalid date range');
  const bal = await getAccountBalances(c, req.user.orgId, { from, to });
  const revenue = bal.filter((a) => a.type === 'REVENUE' && a.balance !== 0).map((a) => ({ ...strip(a), amount: money(-a.balance) }));
  const expenses = bal.filter((a) => a.type === 'EXPENSE' && a.balance !== 0).map((a) => ({ ...strip(a), amount: a.balance }));
  const totalRevenue = money(revenue.reduce((s, r) => s + r.amount, 0)), totalExpenses = money(expenses.reduce((s, r) => s + r.amount, 0));
  res.json({ from, to, revenue, expenses, totalRevenue, totalExpenses, netProfit: money(totalRevenue - totalExpenses) });
}
async function balanceSheet(req, res, c) {
  const asOf = req.query.asOf || today(); if (!isDate(asOf)) throw new ApiError(400, 'Invalid asOf date');
  const bal = await getAccountBalances(c, req.user.orgId, { to: asOf });
  const assets = bal.filter((a) => a.type === 'ASSET' && a.balance !== 0).map((a) => ({ ...strip(a), amount: a.balance }));
  const liabilities = bal.filter((a) => a.type === 'LIABILITY' && a.balance !== 0).map((a) => ({ ...strip(a), amount: money(-a.balance) }));
  const equity = bal.filter((a) => a.type === 'EQUITY' && a.balance !== 0).map((a) => ({ ...strip(a), amount: money(-a.balance) }));
  const earnings = money(-bal.filter((a) => a.type === 'REVENUE' || a.type === 'EXPENSE').reduce((s, a) => s + a.balance, 0));
  if (earnings !== 0) equity.push({ id: null, code: '', name: 'Current period earnings', type: 'EQUITY', amount: earnings });
  const sum = (x) => money(x.reduce((s, r) => s + r.amount, 0));
  const ta = sum(assets), tl = sum(liabilities), te = sum(equity);
  res.json({ asOf, assets, liabilities, equity, totalAssets: ta, totalLiabilities: tl, totalEquity: te, balanced: money(ta - tl - te) === 0 });
}
async function aged(c, orgId, table, openStatuses, asOf) {
  const r = await c.query(`SELECT d.id, d.number, d.due_date, d.currency, c.id AS contact_id, c.name AS contact_name, ((d.total - d.amount_paid) * d.exchange_rate) AS outstanding,
      ($2::date - d.due_date) AS days_overdue FROM ${table} d JOIN contacts c ON c.id=d.contact_id
      WHERE d.organization_id=$1 AND d.status = ANY($3) AND d.total - d.amount_paid > 0 AND d.issue_date <= $2 ORDER BY c.name, d.due_date`, [orgId, asOf, openStatuses]);
  const byContact = new Map(); const totals = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
  for (const x of r.rows) {
    const k = x.days_overdue <= 0 ? 'current' : x.days_overdue <= 30 ? 'd1_30' : x.days_overdue <= 60 ? 'd31_60' : x.days_overdue <= 90 ? 'd61_90' : 'd90plus';
    if (!byContact.has(x.contact_id)) byContact.set(x.contact_id, { contactId: x.contact_id, contactName: x.contact_name, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0, documents: [] });
    const row = byContact.get(x.contact_id); const amt = money(x.outstanding);
    row[k] = money(row[k] + amt); row.total = money(row.total + amt); totals[k] = money(totals[k] + amt); totals.total = money(totals.total + amt);
    row.documents.push({ id: x.id, number: x.number, dueDate: x.due_date, daysOverdue: Math.max(0, x.days_overdue), outstanding: amt });
  }
  return { asOf, rows: [...byContact.values()], totals };
}
const agedReceivables = async (req, res, c) => res.json(await aged(c, req.user.orgId, 'invoices', ['SENT', 'PARTIAL'], req.query.asOf || today()));
const agedPayables = async (req, res, c) => res.json(await aged(c, req.user.orgId, 'bills', ['APPROVED', 'PARTIAL'], req.query.asOf || today()));
/** GET /books-health: Nexus checks its own books (ledger against documents) and reports each check. */
const health = async (req, res, c) => res.json(await booksHealth(c, req.user.orgId));
export { trialBalance, profitAndLoss, balanceSheet, agedReceivables, agedPayables, health };
