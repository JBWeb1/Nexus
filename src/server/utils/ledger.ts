import { ApiError,money } from './helpers';

// SA tax year: 1 March – end Feb. Named by the year it ends in.
async function ensureFinancialYearFor(client, orgId, date) {
  const found = await client.query('SELECT id FROM financial_years WHERE organization_id=$1 AND $2::date BETWEEN start_date AND end_date', [orgId, date]);
  if (found.rowCount) return found.rows[0].id;
  const d = new Date(date + 'T00:00:00Z'); const startYear = d.getUTCMonth() >= 2 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  const start = `${startYear}-03-01`; const end = new Date(Date.UTC(startYear + 1, 3, 0)).toISOString().slice(0, 10);
  await client.query(`INSERT INTO financial_years (organization_id, name, start_date, end_date) VALUES ($1,$2,$3,$4) ON CONFLICT (organization_id, start_date) DO NOTHING`, [orgId, `FY${startYear + 1}`, start, end]);
  const r = await client.query('SELECT id FROM financial_years WHERE organization_id=$1 AND start_date=$2', [orgId, start]);
  return r.rows[0].id;
}

/** The ONLY entry point for ledger writes. Lines: {accountId, debit, credit, description, currency, exchangeRate} */
async function postJournalEntry(client, { orgId, date, description, sourceType, sourceTable = null, sourceId = null, lines, createdBy = null, reversesEntryId = null }: any) {
  if (!Array.isArray(lines) || lines.length < 2) throw new ApiError(400, 'A journal entry needs at least two lines');
  let d = 0, c = 0;
  for (const l of lines) {
    const dr = money(l.debit || 0), cr = money(l.credit || 0);
    if (dr < 0 || cr < 0 || (dr > 0 && cr > 0) || (dr === 0 && cr === 0)) throw new ApiError(400, 'Each journal line must have exactly one positive debit or credit');
    d += Math.round(dr * 100); c += Math.round(cr * 100);
  }
  if (d !== c) throw new ApiError(400, `Journal does not balance (debits ${d / 100} vs credits ${c / 100})`);
  const fyId = await ensureFinancialYearFor(client, orgId, date);
  const e = await client.query(
    `INSERT INTO journal_entries (organization_id, date, description, source_type, source_table, source_id, financial_year_id, created_by, reverses_entry_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [orgId, date, description, sourceType, sourceTable, sourceId, fyId, createdBy, reversesEntryId]);
  const entryId = e.rows[0].id; const out = [];
  for (const l of lines) {
    const r = await client.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description, currency, exchange_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, account_id, debit, credit`,
      [entryId, l.accountId, money(l.debit || 0), money(l.credit || 0), l.description || null, l.currency || 'ZAR', l.exchangeRate || 1]);
    out.push(r.rows[0]);
  }
  return { id: entryId, lines: out };
}

async function reverseJournalEntry(client, { orgId, entryId, date, description, createdBy = null }: any) {
  const e = await client.query('SELECT * FROM journal_entries WHERE id=$1 AND organization_id=$2 FOR UPDATE', [entryId, orgId]);
  if (!e.rowCount) throw new ApiError(404, 'Journal entry not found');
  const entry = e.rows[0];
  if (entry.status !== 'POSTED') throw new ApiError(409, 'Journal entry is already reversed');
  const ls = await client.query('SELECT * FROM journal_lines WHERE journal_entry_id=$1', [entryId]);
  const rev = await postJournalEntry(client, {
    orgId, date: date || new Date().toISOString().slice(0, 10), description: description || `Reversal of: ${entry.description}`,
    sourceType: 'REVERSAL', sourceTable: entry.source_table, sourceId: entry.source_id, createdBy, reversesEntryId: entryId,
    lines: ls.rows.map((l) => ({ accountId: l.account_id, debit: l.credit, credit: l.debit, description: l.description, currency: l.currency, exchangeRate: l.exchange_rate })),
  });
  await client.query("UPDATE journal_entries SET status='REVERSED' WHERE id=$1", [entryId]);
  return rev;
}

/** Per-account totals. opts: {from, to}. balance = debit - credit (positive = debit balance). */
async function getAccountBalances(client, orgId, { from = null, to = null, excludeSourceTypes = [] as string[] } = {}) {
  const r = await client.query(
    `SELECT a.id, a.code, a.name, a.type, a.subtype,
            COALESCE(SUM(l.debit),0) AS debit, COALESCE(SUM(l.credit),0) AS credit
       FROM accounts a
       LEFT JOIN (SELECT jl.* FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id
                   WHERE je.organization_id=$1 AND ($2::date IS NULL OR je.date >= $2) AND ($3::date IS NULL OR je.date <= $3) AND NOT (je.source_type = ANY($4::text[]))) l ON l.account_id=a.id
      WHERE a.organization_id=$1 GROUP BY a.id ORDER BY a.code`, [orgId, from, to, excludeSourceTypes]);
  return r.rows.map((x) => ({ ...x, balance: money(x.debit - x.credit) }));
}

async function accountByCode(client, orgId, code) {
  const r = await client.query('SELECT id FROM accounts WHERE organization_id=$1 AND code=$2', [orgId, code]);
  if (!r.rowCount) throw new ApiError(500, `System account ${code} is missing from the chart of accounts`);
  return r.rows[0].id;
}
export { postJournalEntry, reverseJournalEntry, getAccountBalances, ensureFinancialYearFor, accountByCode };
