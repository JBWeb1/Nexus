import { ApiError,toCamel,money } from '../utils/helpers';
import { postJournalEntry,accountByCode } from '../utils/ledger';

const own = async (c, orgId, id) => { const b = (await c.query('SELECT * FROM bank_accounts WHERE id=$1 AND organization_id=$2', [id, orgId])).rows[0]; if (!b) throw new ApiError(404, 'Bank account not found'); return b; };
async function checkAccount(c, orgId, accountId, direction) {
  const a = (await c.query('SELECT type FROM accounts WHERE id=$1 AND organization_id=$2 AND is_active', [accountId, orgId])).rows[0]; if (!a) throw new ApiError(400, 'Choose an account');
  if (direction === 'DEBIT' && a.type !== 'EXPENSE' && a.type !== 'ASSET' && a.type !== 'LIABILITY' && a.type !== 'EQUITY') throw new ApiError(400, 'Money going out should be posted to an expense, asset, liability or equity account');
  if (direction === 'CREDIT' && a.type !== 'REVENUE' && a.type !== 'LIABILITY' && a.type !== 'EQUITY' && a.type !== 'ASSET') throw new ApiError(400, 'Money coming in should be posted to an income, asset, liability or equity account');
}
async function listRules(req, res, c) { res.json({ rules: toCamel((await c.query('SELECT r.*, a.code AS account_code, a.name AS account_name, t.name AS tax_name FROM bank_rules r JOIN accounts a ON a.id=r.account_id LEFT JOIN tax_rates t ON t.id=r.tax_rate_id WHERE r.organization_id=$1 ORDER BY r.created_at', [req.user.orgId])).rows) }); }
async function createRule(req, res, c) {
  const b = req.body || {}; if (!String(b.matchText || '').trim()) throw new ApiError(400, 'What text should the bank description contain?'); if (!['DEBIT', 'CREDIT'].includes(b.direction)) throw new ApiError(400, 'Direction must be DEBIT (money out) or CREDIT (money in)');
  await checkAccount(c, req.user.orgId, b.accountId, b.direction);
  if (b.taxRateId && !(await c.query('SELECT 1 FROM tax_rates WHERE id=$1 AND organization_id=$2', [b.taxRateId, req.user.orgId])).rowCount) throw new ApiError(400, 'Unknown tax rate');
  const r = await c.query('INSERT INTO bank_rules (organization_id, name, match_text, direction, account_id, tax_rate_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [req.user.orgId, b.name?.trim() || String(b.matchText).trim(), String(b.matchText).trim(), b.direction, b.accountId, b.taxRateId || null]);
  res.status(201).json({ rule: toCamel(r.rows[0]) });
}
async function deleteRule(req, res, c) { const r = await c.query('DELETE FROM bank_rules WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId]); if (!r.rowCount) throw new ApiError(404, 'Rule not found'); res.json({ ok: true }); }

/** Posts one bank line straight to the ledger and reconciles it: bank vs chosen account, with VAT split out when a tax rate is given. */
async function postBankLine(c, { orgId, userId, bank, txn, accountId, taxRateId }) {
  const gross = money(txn.amount); let rate = 0;
  if (taxRateId) rate = Number((await c.query('SELECT rate FROM tax_rates WHERE id=$1 AND organization_id=$2', [taxRateId, orgId])).rows[0]?.rate ?? 0);
  const net = rate > 0 ? money(gross / (1 + rate / 100)) : gross, vat = money(gross - net);
  const out = txn.type === 'DEBIT'; const desc = `Bank: ${txn.description}`;
  const lines = out
    ? [{ accountId, debit: net, description: desc }, ...(vat > 0 ? [{ accountId: await accountByCode(c, orgId, '2110'), debit: vat, description: `VAT ${txn.description}` }] : []), { accountId: bank.account_id, credit: gross, description: desc }]
    : [{ accountId: bank.account_id, debit: gross, description: desc }, { accountId, credit: net, description: desc }, ...(vat > 0 ? [{ accountId: await accountByCode(c, orgId, '2100'), credit: vat, description: `VAT ${txn.description}` }] : [])];
  const je = await postJournalEntry(c, { orgId, date: txn.date, description: desc, sourceType: 'BANK_RECONCILIATION', sourceTable: 'bank_transactions', sourceId: txn.id, lines, createdBy: userId });
  const bankLine = je.lines.find((l) => l.account_id === bank.account_id);
  await c.query("UPDATE bank_transactions SET reconciliation_status='MATCHED', matched_journal_line_id=$2 WHERE id=$1", [txn.id, bankLine.id]);
  return je;
}
async function categorise(req, res, c) {
  const orgId = req.user.orgId; const bank = await own(c, orgId, req.params.id);
  const t = (await c.query('SELECT * FROM bank_transactions WHERE id=$1 AND bank_account_id=$2 FOR UPDATE', [req.params.txnId, bank.id])).rows[0]; if (!t) throw new ApiError(404, 'Transaction not found');
  if (t.reconciliation_status !== 'UNMATCHED') throw new ApiError(409, 'Transaction is already reconciled');
  await checkAccount(c, orgId, req.body?.accountId, t.type === 'DEBIT' ? 'DEBIT' : 'CREDIT');
  await postBankLine(c, { orgId, userId: req.user.userId, bank, txn: t, accountId: req.body.accountId, taxRateId: req.body.taxRateId || null });
  res.json({ ok: true });
}
async function applyRules(req, res, c) {
  const orgId = req.user.orgId; const bank = await own(c, orgId, req.params.id);
  const rules = (await c.query('SELECT * FROM bank_rules WHERE organization_id=$1 ORDER BY created_at', [orgId])).rows;
  const txns = (await c.query("SELECT * FROM bank_transactions WHERE bank_account_id=$1 AND reconciliation_status='UNMATCHED' ORDER BY date FOR UPDATE", [bank.id])).rows;
  let applied = 0; const skipped = [];
  for (const t of txns) {
    const rule = rules.find((r) => r.direction === t.type && t.description.toLowerCase().includes(r.match_text.toLowerCase())); if (!rule) continue;
    await c.query('SAVEPOINT r');
    try { await postBankLine(c, { orgId, userId: req.user.userId, bank, txn: t, accountId: rule.account_id, taxRateId: rule.tax_rate_id }); await c.query('RELEASE SAVEPOINT r'); applied++; }
    catch (e) { await c.query('ROLLBACK TO SAVEPOINT r'); skipped.push(`${t.date} ${t.description}: ${e.message}`); }
  }
  res.json({ applied, skipped, remaining: txns.length - applied });
}
export { listRules, createRule, deleteRule, categorise, applyRules };
