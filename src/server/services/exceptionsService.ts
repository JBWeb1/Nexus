// Rule-based exception engine. Deliberately NOT "AI": every flag carries the evidence that triggered it,
// so an accountant can verify it instead of trusting a black box.
import { money,today,addDays } from '../utils/helpers';
import { getAccountBalances } from '../utils/ledger';
const R = (n, c = 'ZAR') => `${c} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthName = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

async function duplicateDocuments(c, orgId, table, label, route, { from = null, to = null } = {}) {
  const r = await c.query(`SELECT a.id AS a_id, a.number AS a_number, a.issue_date AS a_date, b.id AS b_id, b.number AS b_number, b.issue_date AS b_date, a.total, a.currency, ct.name AS contact
      FROM ${table} a JOIN ${table} b ON a.organization_id=b.organization_id AND a.contact_id=b.contact_id AND a.total=b.total AND a.id < b.id AND ABS(a.issue_date - b.issue_date) <= 7
      JOIN contacts ct ON ct.id=a.contact_id WHERE a.organization_id=$1 AND a.status<>'VOID' AND b.status<>'VOID' AND a.total > 0
       AND ($2::date IS NULL OR b.issue_date >= $2) AND ($3::date IS NULL OR b.issue_date <= $3) ORDER BY b.issue_date DESC LIMIT 50`, [orgId, from, to]);
  return r.rows.map((x) => ({ id: `dup-${table}-${x.a_id}-${x.b_id}`, severity: 'review', category: 'duplicate', title: `Possible duplicate ${label}: ${x.contact}, ${R(x.total, x.currency)}`,
    detail: 'Same contact and same total within 7 days.', evidence: [`${x.a_number} dated ${x.a_date}`, `${x.b_number} dated ${x.b_date}`], link: `${route}/${x.b_id}` }));
}

async function collect(c, orgId, { includeInfo = true } = {}) {
  const t = today(); const items = [];

  // 1. Duplicate payments (urgent: money may have left twice)
  const dp = await c.query(`SELECT a.id AS a_id, b.id AS b_id, a.amount, a.date AS a_date, b.date AS b_date, a.type, COALESCE(i.number, bl.number) AS a_ref
      FROM payments a JOIN payments b ON a.organization_id=b.organization_id AND a.id < b.id AND a.bank_account_id=b.bank_account_id AND a.amount=b.amount AND a.type=b.type AND ABS(a.date-b.date) <= 3
      LEFT JOIN invoices i ON i.id=a.invoice_id LEFT JOIN bills bl ON bl.id=a.bill_id
     WHERE a.organization_id=$1 AND a.status='COMPLETED' AND b.status='COMPLETED' ORDER BY b.date DESC LIMIT 25`, [orgId]);
  for (const x of dp.rows) items.push({ id: `duppay-${x.a_id}-${x.b_id}`, severity: 'urgent', category: 'duplicate', title: `Possible duplicate ${x.type === 'PAYMENT' ? 'payment made' : 'receipt'}: ${R(x.amount)}`,
    detail: 'Two payments of the same amount on the same bank account within 3 days.', evidence: [`First: ${x.a_date}${x.a_ref ? ` (${x.a_ref})` : ''}`, `Second: ${x.b_date}`], link: x.type === 'PAYMENT' ? '/bills' : '/invoices' });

  // 2. Duplicate invoices / bills
  items.push(...await duplicateDocuments(c, orgId, 'invoices', 'invoice', '/invoices'), ...await duplicateDocuments(c, orgId, 'bills', 'bill', '/bills'));

  // 3. Overdue receivables / payables
  const ar = (await c.query(`SELECT COUNT(*) AS n, COALESCE(SUM((total-amount_paid)*exchange_rate),0) AS amt, COUNT(*) FILTER (WHERE $2::date - due_date > 30) AS severe, MAX($2::date - due_date) AS worst
      FROM invoices WHERE organization_id=$1 AND status IN ('SENT','PARTIAL') AND due_date < $2`, [orgId, t])).rows[0];
  if (ar.n > 0) {
    const top = (await c.query(`SELECT i.id, i.number, c.name, ($2::date - i.due_date) AS days, (i.total-i.amount_paid) AS due FROM invoices i JOIN contacts c ON c.id=i.contact_id WHERE i.organization_id=$1 AND i.status IN ('SENT','PARTIAL') AND i.due_date < $2 ORDER BY days DESC LIMIT 3`, [orgId, t])).rows;
    items.push({ id: 'overdue-invoices', severity: ar.severe > 0 ? 'urgent' : 'review', category: 'overdue', title: `${ar.n} overdue invoice${ar.n > 1 ? 's' : ''} — ${R(ar.amt)} outstanding`, detail: ar.severe > 0 ? `${ar.severe} more than 30 days overdue.` : 'Follow up with customers.',
      evidence: top.map((x) => `${x.number} · ${x.name} · ${x.days} days overdue · ${R(x.due)}`), link: '/reports' });
  }
  const ap = (await c.query(`SELECT COUNT(*) AS n, COALESCE(SUM((total-amount_paid)*exchange_rate),0) AS amt FROM bills WHERE organization_id=$1 AND status IN ('APPROVED','PARTIAL') AND due_date < $2`, [orgId, t])).rows[0];
  if (ap.n > 0) items.push({ id: 'overdue-bills', severity: 'review', category: 'overdue', title: `${ap.n} overdue bill${ap.n > 1 ? 's' : ''} — ${R(ap.amt)} to pay`, detail: 'Past their due date.', evidence: [], link: '/bills' });

  // 4. Unusual bill vs the supplier's own history (needs >=3 earlier bills; flags > 2x average)
  const un = await c.query(`SELECT b.id, b.number, b.total, b.currency, b.issue_date, c.name, h.avg_total, h.n FROM bills b JOIN contacts c ON c.id=b.contact_id
      JOIN LATERAL (SELECT AVG(p.total) AS avg_total, COUNT(*) AS n FROM bills p WHERE p.contact_id=b.contact_id AND p.status<>'VOID' AND p.issue_date < b.issue_date) h ON true
     WHERE b.organization_id=$1 AND b.status<>'VOID' AND b.issue_date >= $2 AND h.n >= 3 AND b.total >= 1000 AND b.total > 2 * h.avg_total ORDER BY b.issue_date DESC LIMIT 20`, [orgId, addDays(t, -60)]);
  for (const x of un.rows) items.push({ id: `unusual-${x.id}`, severity: 'review', category: 'anomaly', title: `Unusual bill from ${x.name}: ${R(x.total, x.currency)}`, detail: `More than twice this supplier's average.`,
    evidence: [`${x.number} dated ${x.issue_date}`, `Average of ${x.n} earlier bills: ${R(x.avg_total)}`, `This bill is ${(x.total / x.avg_total).toFixed(1)}× the average`], link: `/bills/${x.id}` });

  // 5. Bank transactions awaiting a match (+ possible duplicate statement lines)
  const ub = (await c.query(`SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS amt, MIN(date) AS oldest FROM bank_transactions bt JOIN bank_accounts ba ON ba.id=bt.bank_account_id WHERE ba.organization_id=$1 AND bt.reconciliation_status='UNMATCHED'`, [orgId])).rows[0];
  if (ub.n > 0) items.push({ id: 'unmatched-bank', severity: 'review', category: 'banking', title: `${ub.n} unmatched bank transaction${ub.n > 1 ? 's' : ''}`, detail: `${R(ub.amt)} not yet reconciled to the ledger.`, evidence: [`Oldest: ${ub.oldest}`], link: '/banking' });
  const db = await c.query(`SELECT a.id AS a_id, b.id AS b_id, a.amount, a.description, a.date AS a_date, b.date AS b_date FROM bank_transactions a JOIN bank_transactions b ON a.bank_account_id=b.bank_account_id AND a.id < b.id AND a.amount=b.amount AND a.type=b.type AND LOWER(a.description)=LOWER(b.description) AND ABS(a.date-b.date) <= 3
      JOIN bank_accounts ba ON ba.id=a.bank_account_id WHERE ba.organization_id=$1 LIMIT 20`, [orgId]);
  for (const x of db.rows) items.push({ id: `dupbank-${x.a_id}-${x.b_id}`, severity: 'review', category: 'duplicate', title: `Possible duplicate bank line: ${R(x.amount)}`, detail: 'Same amount, direction and description within 3 days.', evidence: [`"${x.description}" on ${x.a_date}`, `"${x.description}" on ${x.b_date}`], link: '/banking' });

  // 6. Stale drafts
  const dr = (await c.query(`SELECT (SELECT COUNT(*) FROM invoices WHERE organization_id=$1 AND status='DRAFT' AND created_at < now() - interval '7 days') AS inv, (SELECT COUNT(*) FROM bills WHERE organization_id=$1 AND status='DRAFT' AND created_at < now() - interval '7 days') AS bills`, [orgId])).rows[0];
  if (dr.inv > 0) items.push({ id: 'stale-inv', severity: 'info', category: 'drafts', title: `${dr.inv} invoice draft${dr.inv > 1 ? 's' : ''} older than 7 days`, detail: 'Drafts are not in your books until sent.', evidence: [], link: '/invoices' });
  if (dr.bills > 0) items.push({ id: 'stale-bill', severity: 'info', category: 'drafts', title: `${dr.bills} bill draft${dr.bills > 1 ? 's' : ''} older than 7 days`, detail: 'Unapproved bills are not in your books or VAT.', evidence: [], link: '/bills' });

  // 7. VAT201 for last month not finalized (VAT-registered orgs with VAT activity)
  const org = (await c.query('SELECT vat_registered FROM organizations WHERE id=$1', [orgId])).rows[0];
  if (org?.vat_registered) {
    const d = new Date(); const pm = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)); const ym = pm.toISOString().slice(0, 7);
    const from = `${ym}-01`, to = new Date(Date.UTC(pm.getUTCFullYear(), pm.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const bal = await getAccountBalances(c, orgId, { from, to });
    const active = bal.some((a) => ['2100', '2110'].includes(a.code) && (a.debit || a.credit));
    const fin = (await c.query(`SELECT 1 FROM vat_periods WHERE organization_id=$1 AND status='FINALIZED' AND period_start <= $2 AND period_end >= $3`, [orgId, from, to])).rowCount;
    if (active && !fin) items.push({ id: `vat-${ym}`, severity: 'review', category: 'compliance', title: `VAT201 for ${monthName(ym)} not finalized`, detail: 'There is VAT activity in this month and no finalized VAT period covers it.', evidence: [], link: '/vat201' });
  }
  // 8. Recurring templates due
  if (includeInfo) {
    const rc = (await c.query(`SELECT COUNT(*) AS n FROM recurring_invoices WHERE organization_id=$1 AND status='ACTIVE' AND next_run_date <= $2`, [orgId, t])).rows[0];
    if (rc.n > 0) items.push({ id: 'recurring-due', severity: 'info', category: 'recurring', title: `${rc.n} recurring invoice${rc.n > 1 ? 's' : ''} due to generate`, detail: 'Generated as drafts for your review.', evidence: [], link: '/recurring' });
  }
  const order = { urgent: 0, review: 1, info: 2 };
  return items.sort((a, b) => order[a.severity] - order[b.severity]);
}
export { collect, duplicateDocuments, monthName, R };
