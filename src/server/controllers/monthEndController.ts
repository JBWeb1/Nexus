import { ApiError,toCamel,today } from '../utils/helpers';
import { getAccountBalances } from '../utils/ledger';
import { duplicateDocuments,monthName,R } from '../services/exceptionsService';

function range(period) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) throw new ApiError(400, 'Period must look like 2026-09');
  const [y, m] = period.split('-').map(Number);
  return { from: `${period}-01`, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
}
/** Each check: {key,title,status: ok|issue|warn, blocking, detail, items[], link}. Blocking issues prevent closing. */
async function runChecks(c, orgId, period) {
  const { from, to } = range(period); const checks = [];
  const add = (key, title, issues, { blocking, detail, link, okText }) => checks.push({ key, title, status: issues.length ? (blocking ? 'issue' : 'warn') : 'ok', blocking, detail: issues.length ? detail : okText, items: issues, link });

  const ub = (await c.query(`SELECT bt.date, bt.description, bt.amount FROM bank_transactions bt JOIN bank_accounts ba ON ba.id=bt.bank_account_id WHERE ba.organization_id=$1 AND bt.reconciliation_status='UNMATCHED' AND bt.date BETWEEN $2 AND $3 ORDER BY bt.date`, [orgId, from, to])).rows;
  add('bank', 'Bank transactions reconciled', ub.slice(0, 10).map((x) => `${x.date} · ${x.description} · ${R(x.amount)}`), { blocking: true, link: '/banking', detail: `${ub.length} unmatched bank transaction${ub.length > 1 ? 's' : ''} in this month.`, okText: 'Every bank transaction this month is matched or ignored.' });

  const dr = (await c.query(`SELECT 'Invoice' AS kind, number, issue_date FROM invoices WHERE organization_id=$1 AND status='DRAFT' AND issue_date BETWEEN $2 AND $3
      UNION ALL SELECT 'Bill', number, issue_date FROM bills WHERE organization_id=$1 AND status='DRAFT' AND issue_date BETWEEN $2 AND $3 ORDER BY 3`, [orgId, from, to])).rows;
  add('drafts', 'No draft invoices or bills dated in this month', dr.slice(0, 10).map((x) => `${x.kind} ${x.number} · ${x.issue_date}`), { blocking: true, link: '/invoices', detail: `${dr.length} draft document${dr.length > 1 ? 's' : ''} are not in the books yet. Send/approve or void them.`, okText: 'No drafts dated in this month.' });

  const tb = (await getAccountBalances(c, orgId, { to })).filter((a) => a.debit || a.credit); const dTot = Math.round(tb.reduce((s, a) => s + a.debit, 0) * 100), cTot = Math.round(tb.reduce((s, a) => s + a.credit, 0) * 100);
  add('balanced', 'Trial balance balances', dTot === cTot ? [] : [`Debits ${dTot / 100} vs credits ${cTot / 100}`], { blocking: true, link: '/reports', detail: 'Debits and credits differ — contact support.', okText: 'Debits equal credits.' });

  const org = (await c.query('SELECT vat_registered FROM organizations WHERE id=$1', [orgId])).rows[0];
  if (org.vat_registered) {
    const bal = await getAccountBalances(c, orgId, { from, to }); const active = bal.some((a) => ['2100', '2110'].includes(a.code) && (a.debit || a.credit));
    const fin = (await c.query(`SELECT 1 FROM vat_periods WHERE organization_id=$1 AND status='FINALIZED' AND period_start <= $2 AND period_end >= $3`, [orgId, from, to])).rowCount;
    add('vat', 'VAT reviewed and finalized', active && !fin ? ['No finalized VAT201 period covers this month'] : [], { blocking: true, link: '/vat201', detail: 'This month has VAT activity but no finalized VAT201 period.', okText: active ? 'A finalized VAT201 period covers this month.' : 'No VAT activity this month.' });
  }
  const dups = [...await duplicateDocuments(c, orgId, 'invoices', 'invoice', '/invoices', { from, to }), ...await duplicateDocuments(c, orgId, 'bills', 'bill', '/bills', { from, to })];
  add('duplicates', 'No possible duplicate invoices or bills', dups.slice(0, 8).map((d) => `${d.title} (${d.evidence.join(' / ')})`), { blocking: false, link: '/work-queue', detail: `${dups.length} possible duplicate${dups.length > 1 ? 's' : ''} to review (does not block closing).`, okText: 'No duplicates found.' });

  const od = (await c.query(`SELECT i.number, c.name, ($2::date - i.due_date) AS days, (i.total-i.amount_paid) AS due FROM invoices i JOIN contacts c ON c.id=i.contact_id WHERE i.organization_id=$1 AND i.status IN ('SENT','PARTIAL') AND i.issue_date <= $2 AND i.due_date < $2 ORDER BY days DESC`, [orgId, to])).rows;
  add('debtors', 'Overdue debtors reviewed', od.slice(0, 8).map((x) => `${x.number} · ${x.name} · ${x.days} days overdue · ${R(x.due)}`), { blocking: false, link: '/reports', detail: `${od.length} invoice${od.length > 1 ? 's' : ''} overdue at month end (does not block closing).`, okText: 'Nothing overdue at month end.' });
  return checks;
}
async function status(req, res, c) {
  const period = req.params.period; const { to } = range(period);
  const closed = (await c.query('SELECT period, closed_by_name, closed_at FROM month_closes WHERE organization_id=$1 AND period=$2', [req.user.orgId, period])).rows[0];
  const checks = await runChecks(c, req.user.orgId, period);
  const blocking = checks.filter((x) => x.status === 'issue').length; const passed = checks.filter((x) => x.status === 'ok').length;
  res.json({ period, label: monthName(period), monthEnded: to < today(), closed: closed ? toCamel(closed) : null, checks, progress: Math.round((passed / checks.length) * 100), blockingIssues: blocking, canClose: !closed && to < today() && blocking === 0 });
}
async function list(req, res, c) {
  res.json({ closes: toCamel((await c.query('SELECT period, closed_by_name, closed_at FROM month_closes WHERE organization_id=$1 ORDER BY period DESC', [req.user.orgId])).rows) });
}
async function close(req, res, c) {
  const orgId = req.user.orgId, period = req.params.period; const { to } = range(period);
  if (to >= today()) throw new ApiError(400, 'This month has not ended yet');
  if ((await c.query('SELECT 1 FROM month_closes WHERE organization_id=$1 AND period=$2', [orgId, period])).rowCount) throw new ApiError(409, `${monthName(period)} is already closed`);
  const checks = await runChecks(c, orgId, period); const blocking = checks.filter((x) => x.status === 'issue');
  if (blocking.length) throw new ApiError(409, `Resolve ${blocking.length} blocking issue${blocking.length > 1 ? 's' : ''} before closing`, blocking.map((b) => b.title));
  const u = (await c.query('SELECT name FROM users WHERE id=$1', [req.user.userId])).rows[0];
  await c.query('INSERT INTO month_closes (organization_id, period, closed_by, closed_by_name, issues_snapshot) VALUES ($1,$2,$3,$4,$5)', [orgId, period, req.user.userId, u.name, JSON.stringify(checks.map(({ key, status, detail }) => ({ key, status, detail })))]);
  await c.query(`INSERT INTO period_locks (organization_id, locked_through) VALUES ($1,$2) ON CONFLICT (organization_id) DO UPDATE SET locked_through=GREATEST(period_locks.locked_through, EXCLUDED.locked_through), updated_at=now()`, [orgId, to]);
  res.status(201).json({ closed: { period, label: monthName(period), closedByName: u.name, lockedThrough: to } });
}
export { status, list, close, runChecks };
