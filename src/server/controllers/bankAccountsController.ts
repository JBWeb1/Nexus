import { ApiError,toCamel,money,today,isDate,addDays } from '../utils/helpers';
import { postJournalEntry,accountByCode } from '../utils/ledger';

async function list(req, res, c) {
  const r = await c.query(`SELECT b.*, COALESCE((SELECT SUM(l.debit - l.credit) FROM journal_lines l WHERE l.account_id=b.account_id),0) AS current_balance
     FROM bank_accounts b WHERE b.organization_id=$1 ORDER BY b.created_at`, [req.user.orgId]);
  res.json({ bankAccounts: toCamel(r.rows) });
}
async function create(req, res, c) {
  const orgId = req.user.orgId, { name, bankName, openingBalance = 0 } = req.body || {};
  if (!name?.trim()) throw new ApiError(400, 'Account name is required');
  const ob = money(openingBalance); if (ob < 0) throw new ApiError(400, 'Opening balance cannot be negative');
  const codes = (await c.query("SELECT code FROM accounts WHERE organization_id=$1 AND code ~ '^10[0-9][0-9]$'", [orgId])).rows.map((r) => +r.code);
  const code = String(Math.max(1009, ...codes) + 1); if (+code > 1099) throw new ApiError(409, 'No free bank account codes');
  const acc = (await c.query("INSERT INTO accounts (organization_id, code, name, type, subtype) VALUES ($1,$2,$3,'ASSET','bank') RETURNING id", [orgId, code, `Bank - ${name.trim()}`])).rows[0];
  const b = (await c.query('INSERT INTO bank_accounts (organization_id, account_id, name, bank_name) VALUES ($1,$2,$3,$4) RETURNING *', [orgId, acc.id, name.trim(), bankName || null])).rows[0];
  if (ob > 0) await postJournalEntry(c, { orgId, date: today(), description: `Opening balance - ${name.trim()}`, sourceType: 'JOURNAL', createdBy: req.user.userId,
    lines: [{ accountId: acc.id, debit: ob }, { accountId: await accountByCode(c, orgId, '3000'), credit: ob }] });
  res.status(201).json({ bankAccount: toCamel({ ...b, current_balance: ob }) });
}
async function owned(c, orgId, id) {
  const b = (await c.query('SELECT * FROM bank_accounts WHERE id=$1 AND organization_id=$2', [id, orgId])).rows[0];
  if (!b) throw new ApiError(404, 'Bank account not found'); return b;
}
async function listTransactions(req, res, c) {
  await owned(c, req.user.orgId, req.params.id);
  res.json({ transactions: toCamel((await c.query('SELECT * FROM bank_transactions WHERE bank_account_id=$1 ORDER BY date DESC, created_at DESC', [req.params.id])).rows) });
}
async function addTransaction(req, res, c) {
  await owned(c, req.user.orgId, req.params.id);
  const { date, description, amount, type } = req.body || {}; const a = money(amount);
  if (!isDate(date) || !description?.trim() || !(a > 0) || !['DEBIT', 'CREDIT'].includes(type)) throw new ApiError(400, 'Date, description, positive amount and type (DEBIT = money out, CREDIT = money in) are required');
  const r = await c.query('INSERT INTO bank_transactions (bank_account_id, date, description, amount, type) VALUES ($1,$2,$3,$4,$5) RETURNING *', [req.params.id, date, description.trim(), a, type]);
  res.status(201).json({ transaction: toCamel(r.rows[0]) });
}
async function loadTxn(c, bankId, txnId) {
  const t = (await c.query('SELECT * FROM bank_transactions WHERE id=$1 AND bank_account_id=$2 FOR UPDATE', [txnId, bankId])).rows[0];
  if (!t) throw new ApiError(404, 'Bank transaction not found'); return t;
}
/** Candidate ledger lines on this bank's account: same amount, right direction, within 14 days, not already matched. */
async function suggestions(req, res, c) {
  const bank = await owned(c, req.user.orgId, req.params.id); const t = await loadTxn(c, bank.id, req.params.txnId);
  const col = t.type === 'CREDIT' ? 'debit' : 'credit'; // money in = debit to bank asset
  const r = await c.query(`SELECT l.id AS journal_line_id, je.date, COALESCE(l.description, je.description) AS description, l.${col} AS amount
     FROM journal_lines l JOIN journal_entries je ON je.id=l.journal_entry_id
    WHERE l.account_id=$1 AND l.${col}=$2 AND je.date BETWEEN $3::date AND $4::date
      AND NOT EXISTS (SELECT 1 FROM bank_transactions bt WHERE bt.matched_journal_line_id=l.id) ORDER BY je.date`,
    [bank.account_id, t.amount, addDays(t.date, -14), addDays(t.date, 14)]);
  res.json({ suggestions: toCamel(r.rows) });
}
async function reconcile(req, res, c) {
  const bank = await owned(c, req.user.orgId, req.params.id); const t = await loadTxn(c, bank.id, req.params.txnId);
  if (t.reconciliation_status !== 'UNMATCHED') throw new ApiError(409, 'Transaction is already reconciled');
  if (req.body?.ignore) { const r = await c.query("UPDATE bank_transactions SET reconciliation_status='IGNORED' WHERE id=$1 RETURNING *", [t.id]); return res.json({ transaction: toCamel(r.rows[0]) }); }
  const col = t.type === 'CREDIT' ? 'debit' : 'credit';
  const l = (await c.query(`SELECT l.* FROM journal_lines l WHERE l.id=$1 AND l.account_id=$2`, [req.body?.journalLineId, bank.account_id])).rows[0];
  if (!l) throw new ApiError(400, 'That ledger line does not belong to this bank account');
  if (money(l[col]) !== money(t.amount)) throw new ApiError(400, 'Amounts do not match');
  if ((await c.query('SELECT 1 FROM bank_transactions WHERE matched_journal_line_id=$1', [l.id])).rowCount) throw new ApiError(409, 'Ledger line is already matched');
  const r = await c.query("UPDATE bank_transactions SET reconciliation_status='MATCHED', matched_journal_line_id=$2 WHERE id=$1 RETURNING *", [t.id, l.id]);
  res.json({ transaction: toCamel(r.rows[0]) });
}
export { list, create, listTransactions, addTransaction, suggestions, reconcile };
