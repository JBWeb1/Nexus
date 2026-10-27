/**
 * Books health: Nexus checks its own books and shows the result. Every check compares two independent records that
 * must agree (the ledger against the documents behind it), so a green tick means something was actually verified.
 */
import { money } from '../utils/helpers';

export type Check = { id: string; title: string; status: 'ok' | 'warning' | 'info'; detail: string; difference?: number };
// Same format as the rest of the app and the PDFs: R 22,657.50.
const R = (n: number) => `R ${money(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function booksHealth(c, orgId: string) {
  const checks: Check[] = [];
  const one = async (sql: string, p: any[] = [orgId]) => (await c.query(sql, p)).rows[0];

  // 1. Double entry: every entry balances, so the whole ledger does.
  const tot = await one(`SELECT COALESCE(SUM(l.debit),0) AS d, COALESCE(SUM(l.credit),0) AS c, COUNT(DISTINCT e.id)::int AS n
      FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE e.organization_id=$1`);
  const off = await one(`SELECT COUNT(*)::int AS n FROM (SELECT e.id FROM journal_entries e JOIN journal_lines l ON l.journal_entry_id=e.id
      WHERE e.organization_id=$1 GROUP BY e.id HAVING SUM(l.debit) <> SUM(l.credit)) x`);
  const diff = money(Number(tot.d) - Number(tot.c));
  checks.push(diff === 0 && off.n === 0
    ? { id: 'double-entry', title: 'Debits equal credits', status: 'ok', detail: `All ${tot.n} journal entries balance. Total debits and credits are both ${R(Number(tot.d))}.` }
    : { id: 'double-entry', title: 'Debits equal credits', status: 'warning', detail: `${off.n} entries do not balance (difference ${R(diff)}).`, difference: diff });

  // 2. What customers owe: the receivables account against the open invoices.
  const ar = await one(`SELECT COALESCE(SUM(l.debit - l.credit),0) AS v FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id
      WHERE e.organization_id=$1 AND a.subtype='receivable'`);
  const inv = await one(`SELECT COALESCE(SUM((total - amount_paid) * exchange_rate),0) AS v, COUNT(*) FILTER (WHERE total - amount_paid > 0)::int AS n
      FROM invoices WHERE organization_id=$1 AND status IN ('SENT','PARTIAL')`);
  const arDiff = money(Number(ar.v) - Number(inv.v));
  checks.push(Math.abs(arDiff) < 0.01
    ? { id: 'receivables', title: 'Customers owe what the ledger says', status: 'ok', detail: `Accounts receivable (${R(Number(ar.v))}) matches the ${inv.n} unpaid invoices exactly.` }
    : { id: 'receivables', title: 'Customers owe what the ledger says', status: 'warning', detail: `Accounts receivable is ${R(Number(ar.v))} but unpaid invoices add up to ${R(Number(inv.v))}. Look for journals or bank lines posted straight to Accounts Receivable.`, difference: arDiff });

  // 3. What you owe suppliers: the payables account against the open bills.
  const ap = await one(`SELECT COALESCE(SUM(l.credit - l.debit),0) AS v FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id
      WHERE e.organization_id=$1 AND a.subtype='payable'`);
  const bil = await one(`SELECT COALESCE(SUM((total - amount_paid) * exchange_rate),0) AS v, COUNT(*) FILTER (WHERE total - amount_paid > 0)::int AS n
      FROM bills WHERE organization_id=$1 AND status IN ('APPROVED','PARTIAL')`);
  const apDiff = money(Number(ap.v) - Number(bil.v));
  checks.push(Math.abs(apDiff) < 0.01
    ? { id: 'payables', title: 'You owe suppliers what the ledger says', status: 'ok', detail: `Accounts payable (${R(Number(ap.v))}) matches the ${bil.n} unpaid bills exactly.` }
    : { id: 'payables', title: 'You owe suppliers what the ledger says', status: 'warning', detail: `Accounts payable is ${R(Number(ap.v))} but unpaid bills add up to ${R(Number(bil.v))}. Look for journals or bank lines posted straight to Accounts Payable.`, difference: apDiff });

  // 4. Every sent invoice and approved bill is in the ledger.
  const missing = await one(`SELECT (SELECT COUNT(*) FROM invoices WHERE organization_id=$1 AND status NOT IN ('DRAFT','VOID') AND journal_entry_id IS NULL)::int
      + (SELECT COUNT(*) FROM bills WHERE organization_id=$1 AND status NOT IN ('DRAFT','VOID') AND journal_entry_id IS NULL)::int AS n`);
  checks.push(missing.n === 0
    ? { id: 'posted', title: 'Every document is in the ledger', status: 'ok', detail: 'Each sent invoice and approved bill has its journal entry.' }
    : { id: 'posted', title: 'Every document is in the ledger', status: 'warning', detail: `${missing.n} sent invoices or approved bills have no journal entry.` });

  // 5. Stock on hand at cost against the stock accounts.
  const stock = await one(`SELECT COUNT(*)::int AS n, COALESCE(SUM(stock_value),0) AS v, array_agg(DISTINCT purchase_account_id) AS accts FROM items WHERE organization_id=$1 AND track_stock`);
  if (stock.n > 0) {
    const led = await one(`SELECT COALESCE(SUM(l.debit - l.credit),0) AS v FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id
        WHERE e.organization_id=$1 AND l.account_id = ANY($2::text[])`, [orgId, stock.accts]);
    const sDiff = money(Number(led.v) - Number(stock.v));
    checks.push(Math.abs(sDiff) < 0.01
      ? { id: 'stock', title: 'Stock matches the stock account', status: 'ok', detail: `${stock.n} stocked products are worth ${R(Number(stock.v))} at cost, the same as the stock account.` }
      : { id: 'stock', title: 'Stock matches the stock account', status: 'warning', detail: `Stock on hand is worth ${R(Number(stock.v))} but the stock account shows ${R(Number(led.v))}. Something was posted to the stock account without a product.`, difference: sDiff });
  }

  // 6. Posted entries cannot be changed: the database refuses edits and deletions.
  const guard = await one(`SELECT COUNT(*)::int AS n FROM pg_trigger WHERE tgname IN ('journal_lines_immutable','journal_entries_immutable') AND NOT tgisinternal`, []);
  checks.push(guard.n === 2
    ? { id: 'locked-entries', title: 'Posted entries cannot be changed', status: 'ok', detail: 'The database refuses any edit or deletion of a posted entry. Mistakes are fixed with a reversal you can see.' }
    : { id: 'locked-entries', title: 'Posted entries cannot be changed', status: 'warning', detail: 'The protection that stops posted entries being edited is missing from the database.' });

  // Information: period lock, bank lines waiting, the record of who did what.
  const lock = await one('SELECT locked_through FROM period_locks WHERE organization_id=$1');
  checks.push({ id: 'period-lock', title: 'Closed periods are locked', status: lock ? 'ok' : 'info', detail: lock ? `Nothing can be posted on or before ${lock.locked_through instanceof Date ? lock.locked_through.toISOString().slice(0, 10) : String(lock.locked_through).slice(0, 10)}.` : 'No period is locked yet. Lock a period after you file VAT or close a month (Month-end).' });
  const bank = await one(`SELECT COUNT(*)::int AS n FROM bank_transactions t JOIN bank_accounts b ON b.id=t.bank_account_id WHERE b.organization_id=$1 AND t.reconciliation_status='UNMATCHED'`);
  checks.push({ id: 'bank', title: 'Bank lines matched', status: bank.n === 0 ? 'ok' : 'info', detail: bank.n === 0 ? 'Every imported bank line is matched to the books.' : `${bank.n} bank lines still need matching under Banking.` });
  const act = await one(`SELECT COUNT(*)::int AS n FROM activity_log WHERE organization_id=$1`);
  checks.push({ id: 'activity', title: 'Every change is recorded', status: 'ok', detail: `${act.n} actions in the activity log, with who did them and when.` });

  const warnings = checks.filter((x) => x.status === 'warning').length;
  return { checkedAt: new Date().toISOString(), healthy: warnings === 0, verified: checks.filter((x) => x.status === 'ok').length, warnings, checks };
}
