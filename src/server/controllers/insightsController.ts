import { ApiError,money,today } from '../utils/helpers';
const R = (n) => `R${Math.abs(Math.round(n)).toLocaleString('en-ZA').replace(/ /g, ' ')}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const label = (p) => `${MONTHS[Number(p.slice(5)) - 1]} ${p.slice(0, 4)}`;
const short = (p) => MONTHS[Number(p.slice(5)) - 1].slice(0, 3);
function check(p) { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(p || '')) throw new ApiError(400, 'Month must look like 2026-09'); return p; }
const prevOf = (p) => { const [y, m] = p.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7); };
const bounds = (p) => { const [y, m] = p.split('-').map(Number); return { from: `${p}-01`, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) }; };
const pct = (cur, prev) => (Math.abs(prev) < 0.005 ? null : Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10);
const names = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

async function plByMonth(c, orgId, from, to) {
  const rows = (await c.query(`SELECT to_char(je.date,'YYYY-MM') AS m, a.type, SUM(l.credit - l.debit)::float AS net FROM journal_lines l JOIN journal_entries je ON je.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id
     WHERE je.organization_id=$1 AND je.date BETWEEN $2 AND $3 AND a.type IN ('REVENUE','EXPENSE') GROUP BY 1,2`, [orgId, from, to])).rows;
  const out = {}; for (const r of rows) { out[r.m] ||= { revenue: 0, expenses: 0 }; if (r.type === 'REVENUE') out[r.m].revenue = money(r.net); else out[r.m].expenses = money(-r.net); }
  return out;
}
async function monthly(req, res, c) {
  const n = Math.min(24, Math.max(3, Number(req.query.months) || 12)); const end = today().slice(0, 7); const list = [end]; while (list.length < n) list.unshift(prevOf(list[0]));
  const data = await plByMonth(c, req.user.orgId, `${list[0]}-01`, bounds(end).to);
  res.json({ months: list.map((m) => { const d = data[m] || { revenue: 0, expenses: 0 }; return { month: m, label: short(m), full: label(m), revenue: d.revenue, expenses: d.expenses, profit: money(d.revenue - d.expenses), partial: m === end }; }) });
}
async function balances(c, orgId, to) {
  const r = (await c.query(`SELECT a.code, SUM(l.debit - l.credit)::float AS bal FROM journal_lines l JOIN journal_entries je ON je.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE je.organization_id=$1 AND je.date <= $2 GROUP BY a.code`, [orgId, to])).rows;
  const by = Object.fromEntries(r.map((x) => [x.code, x.bal]));
  const bank = (await c.query(`SELECT COALESCE(SUM(l.debit - l.credit),0)::float AS v FROM journal_lines l JOIN journal_entries je ON je.id=l.journal_entry_id WHERE je.organization_id=$1 AND je.date <= $2 AND l.account_id IN (SELECT account_id FROM bank_accounts WHERE organization_id=$1)`, [orgId, to])).rows[0].v;
  return { debtors: money(by['1100'] || 0), cash: money(bank), vat: money(-(by['2100'] || 0) - (by['2110'] || 0)) };
}
/** This month against last month. Money-in/out measures come straight from the ledger. */
async function changes(req, res, c) {
  const period = req.query.month ? check(req.query.month) : today().slice(0, 7); const prev = prevOf(period); const b = bounds(period), pb = bounds(prev);
  const pl = await plByMonth(c, req.user.orgId, pb.from, b.to); const cur = pl[period] || { revenue: 0, expenses: 0 }, old = pl[prev] || { revenue: 0, expenses: 0 };
  const endCur = b.to > today() ? today() : b.to; const bc = await balances(c, req.user.orgId, endCur), bp = await balances(c, req.user.orgId, pb.to);
  const item = (key, name, now, before, good, drill) => { const ch = money(now - before); const p = pct(now, before); const tone = Math.abs(ch) < 0.005 ? 'flat' : good === 'neutral' ? 'neutral' : ((ch > 0) === (good === 'up') ? 'good' : 'bad'); return { key, label: name, current: money(now), previous: money(before), change: ch, pct: p, tone, drill }; };
  res.json({ month: period, label: label(period), previousLabel: label(prev), partial: b.to >= today(), items: [
    item('revenue', 'Revenue', cur.revenue, old.revenue, 'up', true), item('expenses', 'Expenses', cur.expenses, old.expenses, 'down', true),
    item('profit', 'Profit', cur.revenue - cur.expenses, old.revenue - old.expenses, 'up', false), item('debtors', 'Debtors (owed to you)', bc.debtors, bp.debtors, 'down', true),
    item('cash', 'Cash in the bank', bc.cash, bp.cash, 'up', false), item('vat', 'VAT payable', bc.vat, bp.vat, 'neutral', false)] });
}
/** Why a number moved: accounts, customers or suppliers, new names, unusual suppliers, and the biggest documents, in plain sentences. */
async function explain(req, res, c) {
  const orgId = req.user.orgId; const metric = req.query.metric; const period = check(req.query.month); const prev = prevOf(period); const b = bounds(period), pb = bounds(prev);
  if (metric === 'debtors') {
    const rows = (await c.query(`SELECT c.id, c.name, SUM((i.total-i.amount_paid)*i.exchange_rate)::float AS owed, MIN(i.due_date) AS oldest_due, COUNT(*)::int AS n FROM invoices i JOIN contacts c ON c.id=i.contact_id WHERE i.organization_id=$1 AND i.status IN ('SENT','PARTIAL') GROUP BY c.id, c.name ORDER BY owed DESC LIMIT 12`, [orgId])).rows;
    const t = today(); const list = rows.map((r) => ({ name: r.name, amount: money(r.owed), invoices: r.n, daysOverdue: Math.max(0, Math.floor((Date.parse(t) - Date.parse(r.oldest_due)) / 86400000)), link: `/contacts` }));
    const total = money(list.reduce((s, x) => s + x.amount, 0)); const top3 = list.slice(0, 3);
    return res.json({ metric, month: period, label: label(period), headline: `Customers owe you ${R(total)} right now.`, sentences: top3.length ? [`${names(top3.map((x) => x.name))} account${top3.length === 1 ? 's' : ''} for ${R(top3.reduce((s, x) => s + x.amount, 0))} of it.`, ...(list.filter((x) => x.daysOverdue > 0).length ? [`${list.filter((x) => x.daysOverdue > 0).length} customer${list.filter((x) => x.daysOverdue > 0).length === 1 ? ' has' : 's have'} invoices past their due date.`] : [])] : [], drivers: list.map((x) => ({ name: x.name, change: x.amount, note: x.daysOverdue ? `${x.daysOverdue} days overdue` : 'not yet due', link: '/invoices' })), documents: [], anomalies: [] });
  }
  if (!['revenue', 'expenses'].includes(metric)) throw new ApiError(400, 'Choose revenue, expenses or debtors');
  const rev = metric === 'revenue'; const type = rev ? 'REVENUE' : 'EXPENSE'; const sgn = rev ? 'l.credit - l.debit' : 'l.debit - l.credit';
  const acc = (await c.query(`SELECT a.code, a.name, SUM(CASE WHEN je.date BETWEEN $3 AND $4 THEN ${sgn} ELSE 0 END)::float AS cur, SUM(CASE WHEN je.date BETWEEN $5 AND $6 THEN ${sgn} ELSE 0 END)::float AS prv
     FROM journal_lines l JOIN journal_entries je ON je.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE je.organization_id=$1 AND a.type=$2 AND je.date BETWEEN $5 AND $4 GROUP BY a.code, a.name`, [orgId, type, b.from, b.to, pb.from, pb.to])).rows;
  const total = money(acc.reduce((s, a) => s + a.cur, 0)), before = money(acc.reduce((s, a) => s + a.prv, 0)), change = money(total - before); const p = pct(total, before);
  const word = rev ? 'Revenue' : 'Expenses'; const up = change >= 0;
  const accDrivers = acc.map((a) => ({ name: `${a.code} ${a.name}`, change: money(a.cur - a.prv), current: money(a.cur), previous: money(a.prv) })).filter((a) => Math.abs(a.change) >= 0.5).sort((x, y) => Math.abs(y.change) - Math.abs(x.change)).slice(0, 6);
  const tbl = rev ? 'invoices' : 'bills'; const stat = rev ? "('SENT','PARTIAL','PAID','CREDITED')" : "('APPROVED','PARTIAL','PAID')";
  const docs = (await c.query(`SELECT d.id, d.number, d.issue_date, c.id AS cid, c.name, (d.subtotal*d.exchange_rate)::float AS amt, to_char(d.issue_date,'YYYY-MM') AS m FROM ${tbl} d JOIN contacts c ON c.id=d.contact_id WHERE d.organization_id=$1 AND d.status IN ${stat} AND d.issue_date >= $2 ORDER BY d.issue_date`, [orgId, new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5)) - 8, 1)).toISOString().slice(0, 10)])).rows;
  const byC: Record<string, { name: string; months: Record<string, number> }> = {}; for (const d of docs) { const x = (byC[d.cid] ||= { name: d.name, months: {} }); x.months[d.m] = (x.months[d.m] || 0) + d.amt; }
  const cd = Object.values(byC).map((x) => ({ name: x.name, cur: money(x.months[period] || 0), prv: money(x.months[prev] || 0), hist: Object.entries(x.months).filter(([m]) => m < prev).map(([, v]) => v) }));
  const contactDrivers = cd.map((x) => ({ name: x.name, change: money(x.cur - x.prv), current: x.cur, previous: x.prv })).filter((x) => Math.abs(x.change) >= 0.5).sort((x, y) => (up ? y.change - x.change : x.change - y.change));
  const docChange = money(cd.reduce((s, x) => s + x.cur - x.prv, 0)); const residual = money(change - docChange);
  const dirChange = contactDrivers.filter((x) => (up ? x.change > 0 : x.change < 0)); const top3 = dirChange.slice(0, 3); const sumDir = dirChange.reduce((s, x) => s + Math.abs(x.change), 0);
  const firstSeen = (await c.query(`SELECT c.name, SUM(CASE WHEN d.issue_date BETWEEN $2 AND $3 THEN d.subtotal*d.exchange_rate ELSE 0 END)::float AS amt FROM ${tbl} d JOIN contacts c ON c.id=d.contact_id WHERE d.organization_id=$1 AND d.status IN ${stat} GROUP BY c.id, c.name HAVING MIN(d.issue_date) BETWEEN $2 AND $3`, [orgId, b.from, b.to])).rows;
  const anomalies = []; if (!rev) for (const x of cd) { const h = x.hist.filter((v) => v > 0); if (h.length >= 2 && x.cur > 0) { const avg = h.reduce((s, v) => s + v, 0) / h.length; if (x.cur > 2 * avg && x.cur - avg > 500) anomalies.push({ name: x.name, current: x.cur, usual: money(avg), text: `${x.name}: ${R(x.cur)} this month against a usual ${R(avg)}. That is outside their normal monthly range.` }); } }
  const sentences = []; if (top3.length && sumDir > 0) { const share = Math.round((top3.reduce((s, x) => s + Math.abs(x.change), 0) / sumDir) * 100); sentences.push(`The biggest ${up ? 'increases' : 'decreases'} came from ${names(top3.map((x) => `${x.name} (${up ? '+' : '-'}${R(x.change)})`))}${share < 100 ? `, together ${share}% of all the ${rev ? 'customers' : 'suppliers'} that moved ${up ? 'up' : 'down'}` : ''}.`); }
  if (firstSeen.filter((x) => x.amt > 0).length) sentences.push(`New ${rev ? 'customers' : 'suppliers'} this month: ${names(firstSeen.filter((x) => x.amt > 0).map((x) => `${x.name} (${R(x.amt)})`))}.`);
  if (Math.abs(residual) >= 1) sentences.push(`${R(residual)} ${residual > 0 ? 'more' : 'less'} came from entries that are not invoices or bills, such as bank postings, credit notes or journals.`);
  for (const a of anomalies) sentences.push(a.text);
  const monthDocs = docs.filter((d) => d.m === period).sort((x, y) => y.amt - x.amt).slice(0, 6).map((d) => ({ id: d.id, number: d.number, contact: d.name, amount: money(d.amt), date: d.issue_date, link: `/${tbl}/${d.id}` }));
  res.json({ metric, month: period, label: label(period), previousLabel: label(prev), total, previous: before, change, pct: p, headline: Math.abs(change) < 0.5 ? `${word} were unchanged from ${label(prev)}.` : `${word} ${up ? 'increased' : 'decreased'} by ${R(change)}${p === null ? '' : ` (${up ? '+' : '-'}${Math.abs(p)}%)`} compared with ${label(prev)}.`,
    sentences, drivers: accDrivers.map((d) => ({ ...d, link: '/accounts' })), counterparties: contactDrivers.slice(0, 6), counterpartyLabel: rev ? 'Customers' : 'Suppliers', documents: monthDocs, anomalies });
}
/** How long each customer really takes to pay, so slow payers stand out before they become a problem. */
async function paymentBehaviour(req, res, c) {
  const orgId = req.user.orgId; const t = today();
  const paid = (await c.query(`SELECT c.id, c.name, COUNT(*)::int AS n, AVG(p.date - i.issue_date)::float AS avg_days FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN contacts c ON c.id=i.contact_id WHERE p.organization_id=$1 AND p.type='RECEIPT' AND p.status='COMPLETED' GROUP BY c.id, c.name`, [orgId])).rows;
  const od = (await c.query(`SELECT c.id, c.name, COUNT(*)::int AS n, SUM((i.total-i.amount_paid)*i.exchange_rate)::float AS amt, MAX($2::date - i.due_date)::int AS days FROM invoices i JOIN contacts c ON c.id=i.contact_id WHERE i.organization_id=$1 AND i.status IN ('SENT','PARTIAL') AND i.due_date < $2 GROUP BY c.id, c.name`, [orgId, t])).rows;
  const map = new Map(); for (const r of paid) map.set(r.id, { id: r.id, name: r.name, avgDays: Math.round(r.avg_days), payments: r.n, overdueInvoices: 0, overdueAmount: 0, oldestOverdueDays: 0 });
  for (const r of od) { const x = map.get(r.id) || { id: r.id, name: r.name, avgDays: null, payments: 0 }; Object.assign(x, { overdueInvoices: r.n, overdueAmount: money(r.amt), oldestOverdueDays: r.days }); map.set(r.id, x); }
  const rows = [...map.values()]; const vals = rows.filter((x) => x.avgDays !== null).map((x) => x.avgDays).sort((a, b) => a - b);
  const q = (f) => { if (!vals.length) return null; const i = (vals.length - 1) * f, lo = Math.floor(i), hi = Math.ceil(i); return Math.round(vals[lo] + (vals[hi] - vals[lo]) * (i - lo)); };
  const median = q(0.5), lo = vals.length >= 4 ? q(0.25) : median, hi = vals.length >= 4 ? q(0.75) : median;
  for (const x of rows) { x.flag = (x.avgDays !== null && median !== null && vals.length >= 3 && x.avgDays >= median * 1.5 && x.avgDays - median >= 10) || x.oldestOverdueDays >= 60; x.reason = x.flag ? (x.avgDays !== null && median !== null && x.avgDays >= median * 1.5 ? `Average payment time ${x.avgDays} days. Typical range for your customers: ${lo}-${hi} days.` : `Has an invoice ${x.oldestOverdueDays} days past due.`) : null; }
  rows.sort((a, b) => (b.flag - a.flag) || ((b.avgDays ?? -1) - (a.avgDays ?? -1)));
  res.json({ typical: median === null ? null : { median, low: lo, high: hi }, customers: rows.slice(0, 12) });
}
async function reconciliation(req, res, c) {
  const r = (await c.query(`SELECT bt.reconciliation_status AS s, COUNT(*)::int AS n FROM bank_transactions bt JOIN bank_accounts ba ON ba.id=bt.bank_account_id WHERE ba.organization_id=$1 GROUP BY 1`, [req.user.orgId])).rows;
  const g = (s) => r.find((x) => x.s === s)?.n || 0; const total = g('MATCHED') + g('UNMATCHED') + g('IGNORED');
  res.json({ total, matched: g('MATCHED'), ignored: g('IGNORED'), unmatched: g('UNMATCHED'), matchedPct: total ? Math.round(((g('MATCHED') + g('IGNORED')) / total) * 100) : 100 });
}
export { monthly, changes, explain, paymentBehaviour, reconciliation };
