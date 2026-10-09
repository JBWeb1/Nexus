import { buildWorkbook,sendXlsx } from '../services/exportService';
import { getAccountBalances } from '../utils/ledger';
import { today,money } from '../utils/helpers';

async function generalLedger(req, res, c) {
  const r = await c.query(`SELECT je.date, je.description AS entry, je.source_type AS source, je.status, a.code, a.name AS account, l.debit, l.credit, l.description AS line_description
     FROM journal_lines l JOIN journal_entries je ON je.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE je.organization_id=$1 ORDER BY je.date, je.created_at, l.id`, [req.user.orgId]);
  const wb = await buildWorkbook([{ name: 'General Ledger', rows: r.rows, columns: [
    { header: 'Date', key: 'date', width: 12 }, { header: 'Entry', key: 'entry', width: 36 }, { header: 'Source', key: 'source', width: 14 }, { header: 'Status', key: 'status', width: 10 },
    { header: 'Account Code', key: 'code', width: 12 }, { header: 'Account', key: 'account', width: 28 }, { header: 'Debit', key: 'debit', money: true }, { header: 'Credit', key: 'credit', money: true }, { header: 'Line Description', key: 'line_description', width: 30 }] }]);
  await sendXlsx(res, wb, `general-ledger-${today()}.xlsx`);
}
async function trialBalance(req, res, c) {
  const rows = (await getAccountBalances(c, req.user.orgId, { to: today() })).filter((a) => a.debit || a.credit)
    .map((a) => ({ code: a.code, name: a.name, type: a.type, debit: a.balance > 0 ? a.balance : 0, credit: a.balance < 0 ? money(-a.balance) : 0 }));
  const wb = await buildWorkbook([{ name: 'Trial Balance', rows, columns: [{ header: 'Code', key: 'code', width: 10 }, { header: 'Account', key: 'name', width: 32 }, { header: 'Type', key: 'type', width: 12 }, { header: 'Debit', key: 'debit', money: true }, { header: 'Credit', key: 'credit', money: true }] }]);
  await sendXlsx(res, wb, `trial-balance-${today()}.xlsx`);
}
const docExport = (table, label) => async (req, res, c) => {
  const r = await c.query(`SELECT d.number, ct.name AS contact, d.status, d.issue_date, d.due_date, d.currency, d.subtotal, d.tax_total, d.total, d.amount_paid FROM ${table} d JOIN contacts ct ON ct.id=d.contact_id WHERE d.organization_id=$1 ORDER BY d.issue_date, d.number`, [req.user.orgId]);
  const wb = await buildWorkbook([{ name: label, rows: r.rows, columns: [{ header: 'Number', key: 'number' }, { header: 'Contact', key: 'contact', width: 28 }, { header: 'Status', key: 'status' }, { header: 'Issue Date', key: 'issue_date' }, { header: 'Due Date', key: 'due_date' }, { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Subtotal', key: 'subtotal', money: true }, { header: 'VAT', key: 'tax_total', money: true }, { header: 'Total', key: 'total', money: true }, { header: 'Paid', key: 'amount_paid', money: true }] }]);
  await sendXlsx(res, wb, `${table}-${today()}.xlsx`);
};
/** Everything the company holds, as one JSON file (data portability / POPIA access request). */
async function companyData(req, res, c) {
  const id = req.user.orgId; const q = async (sql) => (await c.query(sql, [id])).rows;
  const out = { exportedAt: new Date().toISOString(), company: (await q('SELECT * FROM organizations WHERE id=$1'))[0] };
  for (const [k, sql] of Object.entries({
    accounts: 'SELECT * FROM accounts WHERE organization_id=$1 ORDER BY code', taxRates: 'SELECT * FROM tax_rates WHERE organization_id=$1', contacts: 'SELECT * FROM contacts WHERE organization_id=$1',
    invoices: 'SELECT * FROM invoices WHERE organization_id=$1 ORDER BY number', invoiceLines: 'SELECT l.* FROM invoice_lines l JOIN invoices i ON i.id=l.invoice_id WHERE i.organization_id=$1',
    bills: 'SELECT * FROM bills WHERE organization_id=$1 ORDER BY number', billLines: 'SELECT l.* FROM bill_lines l JOIN bills b ON b.id=l.bill_id WHERE b.organization_id=$1',
    quotes: 'SELECT * FROM quotes WHERE organization_id=$1', creditNotes: 'SELECT * FROM credit_notes WHERE organization_id=$1', payments: 'SELECT * FROM payments WHERE organization_id=$1',
    bankAccounts: 'SELECT * FROM bank_accounts WHERE organization_id=$1', bankTransactions: 'SELECT t.* FROM bank_transactions t JOIN bank_accounts b ON b.id=t.bank_account_id WHERE b.organization_id=$1',
    journalEntries: 'SELECT * FROM journal_entries WHERE organization_id=$1 ORDER BY date', journalLines: 'SELECT l.* FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE e.organization_id=$1',
    vatPeriods: 'SELECT * FROM vat_periods WHERE organization_id=$1', monthCloses: 'SELECT * FROM month_closes WHERE organization_id=$1', notes: 'SELECT * FROM notes WHERE organization_id=$1', activity: 'SELECT * FROM activity_log WHERE organization_id=$1 ORDER BY created_at',
  })) out[k] = await q(sql);
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Content-Disposition', `attachment; filename="company-data-${new Date().toISOString().slice(0, 10)}.json"`); res.send(JSON.stringify(out, null, 2));
}
const invoices = docExport('invoices', 'Invoices');
const bills = docExport('bills', 'Bills');
export { companyData, generalLedger, trialBalance, invoices, bills };
