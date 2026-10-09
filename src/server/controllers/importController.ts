import { ApiError,money,isDate } from '../utils/helpers';
import { parseExpenseSpreadsheet } from '../services/importService';
import { postJournalEntry } from '../utils/ledger';

async function preview(req, res, c) {
  if (!req.file) throw new ApiError(400, 'Upload a .xlsx or .csv file in the "file" field');
  res.json(await parseExpenseSpreadsheet(req.file));
}
/** Each row runs in its own SAVEPOINT: one bad row (e.g. locked period) never sinks the batch. */
async function commit(req, res, c) {
  const orgId = req.user.orgId, { bankAccountId, rows } = req.body || {};
  if (!Array.isArray(rows) || !rows.length) throw new ApiError(400, 'No rows to import');
  const bank = (await c.query('SELECT * FROM bank_accounts WHERE id=$1 AND organization_id=$2', [bankAccountId, orgId])).rows[0];
  if (!bank) throw new ApiError(400, 'Choose the bank account these expenses were paid from');
  let imported = 0; const failed = [];
  for (const [i, r] of rows.entries()) {
    const label = r.rowNumber ?? i + 1;
    await c.query('SAVEPOINT imp');
    try {
      const amount = money(r.amount);
      if (!isDate(r.date) || !(amount > 0) || !r.accountId) throw new ApiError(400, 'Needs a valid date, amount and expense account');
      const acc = (await c.query("SELECT id FROM accounts WHERE id=$1 AND organization_id=$2 AND type='EXPENSE'", [r.accountId, orgId])).rows[0];
      if (!acc) throw new ApiError(400, 'Choose an expense account');
      const je = await postJournalEntry(c, { orgId, date: r.date, description: r.description || 'Imported expense', sourceType: 'JOURNAL', sourceTable: 'import', createdBy: req.user.userId,
        lines: [{ accountId: acc.id, debit: amount, description: r.description }, { accountId: bank.account_id, credit: amount, description: r.description }] });
      const bankLine = je.lines.find((l) => l.account_id === bank.account_id);
      await c.query(`INSERT INTO bank_transactions (bank_account_id, date, description, amount, type, reconciliation_status, matched_journal_line_id) VALUES ($1,$2,$3,$4,'DEBIT','MATCHED',$5)`,
        [bank.id, r.date, r.description || 'Imported expense', amount, bankLine.id]);
      await c.query('RELEASE SAVEPOINT imp'); imported++;
    } catch (e) {
      await c.query('ROLLBACK TO SAVEPOINT imp'); await c.query('RELEASE SAVEPOINT imp');
      failed.push({ rowNumber: label, error: e.code === 'P0001' ? e.message.replace(/^.*?Period/, 'Period') : e.message });
    }
  }
  res.json({ imported, failed });
}
export { preview, commit };
