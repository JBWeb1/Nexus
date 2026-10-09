import { toCamel,money,today } from '../utils/helpers';
import { getAccountBalances } from '../utils/ledger';
async function summary(req, res, c) {
  const orgId = req.user.orgId, t = today(), from = t.slice(0, 8) + '01';
  const bank = (await c.query(`SELECT COALESCE(SUM(l.debit - l.credit),0) AS v FROM journal_lines l WHERE l.account_id IN (SELECT account_id FROM bank_accounts WHERE organization_id=$1)`, [orgId])).rows[0].v;
  const ar = (await c.query(`SELECT COALESCE(SUM((total-amount_paid)*exchange_rate),0) AS v, COUNT(*) FILTER (WHERE due_date < $2) AS overdue FROM invoices WHERE organization_id=$1 AND status IN ('SENT','PARTIAL')`, [orgId, t])).rows[0];
  const ap = (await c.query(`SELECT COALESCE(SUM((total-amount_paid)*exchange_rate),0) AS v FROM bills WHERE organization_id=$1 AND status IN ('APPROVED','PARTIAL')`, [orgId])).rows[0];
  const bal = await getAccountBalances(c, orgId, { from, to: t });
  const revenue = money(-bal.filter((a) => a.type === 'REVENUE').reduce((s, a) => s + a.balance, 0)), expenses = money(bal.filter((a) => a.type === 'EXPENSE').reduce((s, a) => s + a.balance, 0));
  const recent = (await c.query(`SELECT i.id, i.number, i.status, i.total, i.currency, i.due_date, c.name AS contact_name FROM invoices i JOIN contacts c ON c.id=i.contact_id WHERE i.organization_id=$1 ORDER BY i.created_at DESC LIMIT 5`, [orgId])).rows;
  res.json(toCamel({ bankBalance: money(bank), receivables: money(ar.v), overdueInvoices: ar.overdue, payables: money(ap.v), monthRevenue: revenue, monthExpenses: expenses, monthProfit: money(revenue - expenses), recentInvoices: recent }));
}
export { summary };
