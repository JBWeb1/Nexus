import { ApiError,money,isDate,toCamel,addDays } from '../utils/helpers';
import { parseExpenseSpreadsheet,parseOpeningSpreadsheet } from '../services/importService';
import { postJournalEntry,accountByCode } from '../utils/ledger';
import { nextNumber,termsDays } from '../utils/documents';

/** SARS: a claim above R5,000 needs a full tax invoice on file. */
const FULL_TAX_INVOICE_OVER = 5000;
// Never carry VAT: wages, bank charges. Fuel is zero-rated in South Africa.
const NO_VAT_CODES = ['6000', '6400'];
const FUEL = /\b(fuel|petrol|diesel|engen|shell|sasol|caltex|bp|astron|total ?energies)\b/i;

/** The first word worth matching on in a description: "Eskom prepaid electricity" -> "eskom". */
const keyword = (d: string) => (String(d || '').toLowerCase().match(/[a-z][a-z0-9&'-]{2,}/g) || []).find((w) => !['the', 'and', 'for', 'from', 'payment', 'pmt', 'debit', 'order', 'refund', 'pos', 'purchase'].includes(w)) || '';
const sameText = (a: string, b: string) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

async function context(c, orgId) {
  const accounts = (await c.query("SELECT id, code, name, type FROM accounts WHERE organization_id=$1 AND is_active", [orgId])).rows;
  const rates = (await c.query('SELECT id, name, rate FROM tax_rates WHERE organization_id=$1', [orgId])).rows;
  const org = (await c.query('SELECT vat_registered FROM organizations WHERE id=$1', [orgId])).rows[0];
  const rules = (await c.query('SELECT * FROM bank_rules WHERE organization_id=$1 ORDER BY created_at', [orgId])).rows;
  return { accounts, rates, vatRegistered: !!org?.vat_registered, rules,
    standard: rates.find((r) => Number(r.rate) === 15) || rates.find((r) => Number(r.rate) > 0), zero: rates.find((r) => /zero/i.test(r.name)) };
}
/** Suggest the expense account: the sheet's own category, then a saved rule, then what this description went to last time. */
async function suggestAccount(c, orgId, ctx, row) {
  const expense = ctx.accounts.filter((a) => a.type === 'EXPENSE');
  if (row.category) {
    const cat = row.category.toLowerCase();
    const hit = expense.find((a) => a.code === row.category.trim()) || expense.find((a) => a.name.toLowerCase() === cat)
      || expense.find((a) => a.name.toLowerCase().includes(cat) || cat.includes(a.name.toLowerCase().split(/[ &]/)[0]));
    if (hit) return { accountId: hit.id, taxRateId: null, source: 'category' };
  }
  const dir = row.direction === 'REFUND' ? 'CREDIT' : 'DEBIT';
  const rule = ctx.rules.find((r) => row.description.toLowerCase().includes(r.match_text.toLowerCase()) && (r.direction === dir || row.direction === 'REFUND'));
  if (rule && expense.some((a) => a.id === rule.account_id)) return { accountId: rule.account_id, taxRateId: rule.tax_rate_id, source: 'rule' };
  const kw = keyword(row.description);
  if (kw) {
    const past = (await c.query(`SELECT l.account_id FROM journal_lines l JOIN journal_entries je ON je.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id
       WHERE je.organization_id=$1 AND je.source_table IN ('import','bank_transactions') AND a.type='EXPENSE' AND lower(COALESCE(l.description, je.description)) LIKE $2
       ORDER BY je.date DESC LIMIT 1`, [orgId, `%${kw}%`])).rows[0];
    if (past) return { accountId: past.account_id, taxRateId: null, source: 'history' };
  }
  return { accountId: expense.find((a) => a.code === '6900')?.id || '', taxRateId: null, source: 'default' };
}
function suggestTax(ctx, accountId, description, ruleTax) {
  if (!ctx.vatRegistered) return null;
  if (ruleTax !== null && ruleTax !== undefined) return ruleTax;
  const code = ctx.accounts.find((a) => a.id === accountId)?.code;
  if (NO_VAT_CODES.includes(code) || FUEL.test(description)) return ctx.zero?.id || null;
  return ctx.standard?.id || null;
}
/** Bank lines already on the books (any of this company's bank accounts) with the same date, amount, direction and description. */
async function existing(c, orgId, rows) {
  const dates = [...new Set(rows.filter((r) => r.date).map((r) => r.date))]; if (!dates.length) return [];
  return (await c.query(`SELECT bt.date::text AS date, bt.amount::float AS amount, bt.type, bt.description FROM bank_transactions bt JOIN bank_accounts b ON b.id=bt.bank_account_id
     WHERE b.organization_id=$1 AND bt.date = ANY($2::date[])`, [orgId, dates])).rows;
}
const isDup = (have, r) => have.some((h) => h.date === r.date && money(h.amount) === money(r.amount) && h.type === (r.direction === 'REFUND' ? 'CREDIT' : 'DEBIT') && sameText(h.description, r.description));

async function preview(req, res, c) {
  if (!req.file) throw new ApiError(400, 'Upload a .xlsx or .csv file in the "file" field');
  const orgId = req.user.orgId; const parsed = await parseExpenseSpreadsheet(req.file); const ctx = await context(c, orgId);
  const have = await existing(c, orgId, parsed.rows); const seen = [];
  const rows = [];
  for (const r of parsed.rows) {
    const s = await suggestAccount(c, orgId, ctx, r);
    const taxRateId = suggestTax(ctx, s.accountId, r.description, s.taxRateId);
    const duplicate = r.valid && (isDup(have, r) ? 'ALREADY_IMPORTED' : isDup(seen, r) ? 'TWICE_IN_FILE' : null);
    if (r.valid) seen.push({ date: r.date, amount: r.amount, type: r.direction === 'REFUND' ? 'CREDIT' : 'DEBIT', description: r.description });
    const rate = Number(ctx.rates.find((t) => t.id === taxRateId)?.rate || 0);
    rows.push({ ...r, accountId: s.accountId, accountSource: s.source, taxRateId, duplicate, needsTaxInvoice: rate > 0 && r.direction === 'EXPENSE' && (r.amount || 0) > FULL_TAX_INVOICE_OVER });
  }
  res.json({ detectedColumns: parsed.detectedColumns, convention: parsed.convention, vatRegistered: ctx.vatRegistered, rows });
}

/**
 * Expense: Dr expense (net), Dr VAT Input, Cr bank (gross). Refund: the reverse, so it lowers the expense and the VAT claimed.
 * Each row runs in its own SAVEPOINT: one bad row (e.g. locked period) never sinks the batch.
 */
async function commit(req, res, c) {
  const orgId = req.user.orgId, { bankAccountId, rows, allowDuplicates } = req.body || {};
  if (!Array.isArray(rows) || !rows.length) throw new ApiError(400, 'No rows to import');
  const bank = (await c.query('SELECT * FROM bank_accounts WHERE id=$1 AND organization_id=$2', [bankAccountId, orgId])).rows[0];
  if (!bank) throw new ApiError(400, 'Choose the bank account these expenses were paid from');
  const ctx = await context(c, orgId); const vatInput = await accountByCode(c, orgId, '2110');
  const have = allowDuplicates ? [] : await existing(c, orgId, rows.map((r) => ({ ...r, amount: money(r.amount) })));
  let imported = 0, refunds = 0, vatClaimed = 0, rulesCreated = 0; const failed = [], duplicates = [];
  for (const [i, r] of rows.entries()) {
    const label = r.rowNumber ?? i + 1; const direction = r.direction === 'REFUND' ? 'REFUND' : 'EXPENSE';
    const row = { date: r.date, amount: money(r.amount), direction, description: String(r.description || 'Imported expense').trim() };
    if (!allowDuplicates && isDup(have, row)) { duplicates.push({ rowNumber: label, error: 'Already on the books (same date, amount and description), so skipped' }); continue; }
    await c.query('SAVEPOINT imp');
    try {
      const gross = row.amount;
      if (!isDate(row.date) || !(gross > 0) || !r.accountId) throw new ApiError(400, 'Needs a valid date, amount and expense account');
      const acc = ctx.accounts.find((a) => a.id === r.accountId && a.type === 'EXPENSE'); if (!acc) throw new ApiError(400, 'Choose an expense account');
      const rate = r.taxRateId ? ctx.rates.find((t) => t.id === r.taxRateId) : null; if (r.taxRateId && !rate) throw new ApiError(400, 'Unknown tax rate');
      const net = rate && Number(rate.rate) > 0 ? money(gross / (1 + Number(rate.rate) / 100)) : gross, vat = money(gross - net);
      const out = direction === 'EXPENSE'; const d = row.description;
      const lines = out
        ? [{ accountId: acc.id, debit: net, description: d }, ...(vat > 0 ? [{ accountId: vatInput, debit: vat, description: `VAT ${d}` }] : []), { accountId: bank.account_id, credit: gross, description: d }]
        : [{ accountId: bank.account_id, debit: gross, description: d }, { accountId: acc.id, credit: net, description: d }, ...(vat > 0 ? [{ accountId: vatInput, credit: vat, description: `VAT ${d}` }] : [])];
      const je = await postJournalEntry(c, { orgId, date: row.date, description: out ? d : `Refund: ${d}`, sourceType: 'JOURNAL', sourceTable: 'import', createdBy: req.user.userId, lines });
      const bankLine = je.lines.find((l) => l.account_id === bank.account_id);
      await c.query(`INSERT INTO bank_transactions (bank_account_id, date, description, amount, type, reconciliation_status, matched_journal_line_id) VALUES ($1,$2,$3,$4,$5,'MATCHED',$6)`,
        [bank.id, row.date, d, gross, out ? 'DEBIT' : 'CREDIT', bankLine.id]);
      // "Always do this": save the choice as a bank rule, which also serves the bank feed.
      const kw = keyword(d);
      if (r.remember && kw && !ctx.rules.some((x) => x.match_text.toLowerCase() === kw)) {
        const rule = (await c.query('INSERT INTO bank_rules (organization_id, name, match_text, direction, account_id, tax_rate_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
          [orgId, `${kw} -> ${acc.name}`, kw, 'DEBIT', acc.id, r.taxRateId || null])).rows[0];
        ctx.rules.push(rule); rulesCreated++;
      }
      await c.query('RELEASE SAVEPOINT imp'); imported++; if (!out) refunds++; vatClaimed = money(vatClaimed + (out ? vat : -vat));
      have.push({ date: row.date, amount: gross, type: out ? 'DEBIT' : 'CREDIT', description: d });
    } catch (e) {
      await c.query('ROLLBACK TO SAVEPOINT imp'); await c.query('RELEASE SAVEPOINT imp');
      failed.push({ rowNumber: label, error: e.code === 'P0001' ? e.message.replace(/^.*?Period/, 'Period') : e.message });
    }
  }
  res.json({ imported, refunds, vatClaimed, rulesCreated, duplicates, failed });
}

async function openingPreview(req, res, c) {
  if (!req.file) throw new ApiError(400, 'Upload a .xlsx or .csv file in the "file" field');
  const parsed = await parseOpeningSpreadsheet(req.file);
  const kind = req.body?.kind === 'CREDITORS' ? 'SUPPLIER' : 'CUSTOMER';
  const contacts = (await c.query('SELECT id, name, type FROM contacts WHERE organization_id=$1', [req.user.orgId])).rows;
  res.json({ ...parsed, rows: parsed.rows.map((r) => ({ ...r, contactId: contacts.find((x) => sameText(x.name, r.contactName))?.id || null })), contactType: kind });
}
/**
 * Brings over invoices still owed by customers (DEBTORS) or bills still owed to suppliers (CREDITORS) on the day the books move over.
 * Each becomes an open invoice/bill so it can be paid and shows in aged debtors/creditors. The other side is owner's equity:
 * the sale or purchase (and its VAT) was already in the old books, so it must not count as income, expense or VAT again.
 */
async function openingCommit(req, res, c) {
  const orgId = req.user.orgId, { kind, asAt, rows } = req.body || {};
  if (!['DEBTORS', 'CREDITORS'].includes(kind)) throw new ApiError(400, 'Choose debtors (customers who owe you) or creditors (suppliers you owe)');
  if (!isDate(asAt)) throw new ApiError(400, 'Choose the date your books move over');
  if (!Array.isArray(rows) || !rows.length) throw new ApiError(400, 'No rows to import');
  const debtors = kind === 'DEBTORS'; const equity = await accountByCode(c, orgId, '3000'), control = await accountByCode(c, orgId, debtors ? '1100' : '2000');
  const terms = await termsDays(c, orgId);
  let imported = 0, total = 0, contactsCreated = 0; const failed = [];
  for (const [i, r] of rows.entries()) {
    const label = r.rowNumber ?? i + 1; await c.query('SAVEPOINT op');
    try {
      const amount = money(r.amount); const name = String(r.contactName || '').trim();
      if (!name || !(amount > 0)) throw new ApiError(400, 'Needs a name and an amount owing');
      const issue = isDate(r.date) && r.date <= asAt ? r.date : asAt, due = isDate(r.dueDate) ? r.dueDate : addDays(issue, terms);
      let contact = (await c.query('SELECT id FROM contacts WHERE organization_id=$1 AND lower(name)=lower($2) LIMIT 1', [orgId, name])).rows[0];
      if (!contact) { contact = (await c.query('INSERT INTO contacts (organization_id, name, type) VALUES ($1,$2,$3) RETURNING id', [orgId, name, debtors ? 'CUSTOMER' : 'SUPPLIER'])).rows[0]; contactsCreated++; }
      const ref = String(r.reference || '').trim(); const desc = `Opening balance${ref ? ` (old ${debtors ? 'invoice' : 'bill'} ${ref})` : ''}`;
      const table = debtors ? 'invoices' : 'bills';
      if ((await c.query(`SELECT 1 FROM ${table} WHERE organization_id=$1 AND opening_balance AND contact_id=$2 AND notes=$3 AND total=$4 AND status <> 'VOID'`, [orgId, contact.id, desc, amount])).rowCount)
        throw new ApiError(409, 'Already brought over (same name, reference and amount)');
      const number = debtors ? await nextNumber(c, orgId, 'invoices', 'INV') : ref || await nextNumber(c, orgId, 'bills', 'BILL');
      const doc = (await c.query(`INSERT INTO ${table} (organization_id, contact_id, number, issue_date, due_date, currency, exchange_rate, subtotal, tax_total, total, notes, opening_balance)
         VALUES ($1,$2,$3,$4,$5,'ZAR',1,$6,0,$6,$7,true) RETURNING *`, [orgId, contact.id, number, issue, due, amount, desc])).rows[0];
      await c.query(`INSERT INTO ${debtors ? 'invoice_lines' : 'bill_lines'} (${debtors ? 'invoice_id' : 'bill_id'}, description, quantity, unit_price, account_id, tax_rate_id, line_total, tax_amount) VALUES ($1,$2,1,$3,$4,NULL,$3,0)`,
        [doc.id, desc, amount, equity]);
      const lines = debtors ? [{ accountId: control, debit: amount, description: `${number} ${desc}` }, { accountId: equity, credit: amount, description: `${number} ${desc}` }]
        : [{ accountId: equity, debit: amount, description: `${number} ${desc}` }, { accountId: control, credit: amount, description: `${number} ${desc}` }];
      // Dated the move-over day, so it sits with the opening bank balance, not inside the old months.
      const je = await postJournalEntry(c, { orgId, date: asAt, description: `${debtors ? 'Invoice' : 'Bill'} ${number} ${desc}`, sourceType: debtors ? 'SALES' : 'PURCHASE', sourceTable: table, sourceId: doc.id, lines, createdBy: req.user.userId });
      await c.query(`UPDATE ${table} SET status=$2, journal_entry_id=$3 WHERE id=$1`, [doc.id, debtors ? 'SENT' : 'APPROVED', je.id]);
      await c.query('RELEASE SAVEPOINT op'); imported++; total = money(total + amount);
    } catch (e) {
      await c.query('ROLLBACK TO SAVEPOINT op'); await c.query('RELEASE SAVEPOINT op');
      failed.push({ rowNumber: label, error: e.code === 'P0001' ? e.message.replace(/^.*?Period/, 'Period') : e.code === '23505' ? 'That bill number already exists for this company' : e.message });
    }
  }
  res.json({ imported, total, contactsCreated, failed });
}
export { preview, commit, openingPreview, openingCommit, keyword };
