import { ApiError,money,isDate } from './helpers';

/** Validates + prices document lines. Returns {lines (with lineTotal,taxAmount), subtotal, taxTotal, total}. */
async function priceLines(client, orgId, rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) throw new ApiError(400, 'At least one line item is required');
  const rates = new Map((await client.query('SELECT id, rate FROM tax_rates WHERE organization_id=$1', [orgId])).rows.map((r) => [r.id, r.rate]));
  const accts = new Set((await client.query('SELECT id FROM accounts WHERE organization_id=$1 AND is_active', [orgId])).rows.map((r) => r.id));
  let subtotal = 0, taxTotal = 0;
  const lines = rawLines.map((l, i) => {
    const qty = Number(l.quantity ?? 1), price = Number(l.unitPrice);
    if (!l.description || !String(l.description).trim()) throw new ApiError(400, `Line ${i + 1}: description is required`);
    if (!(qty > 0) || !isFinite(price) || price < 0) throw new ApiError(400, `Line ${i + 1}: invalid quantity or price`);
    if (!accts.has(l.accountId)) throw new ApiError(400, `Line ${i + 1}: unknown account`);
    if (l.taxRateId && !rates.has(l.taxRateId)) throw new ApiError(400, `Line ${i + 1}: unknown tax rate`);
    const lineTotal = money(qty * price); const taxAmount = l.taxRateId ? money(lineTotal * Number(rates.get(l.taxRateId)) / 100) : 0;
    subtotal += lineTotal; taxTotal += taxAmount;
    return { description: String(l.description).trim(), quantity: qty, unitPrice: price, accountId: l.accountId, taxRateId: l.taxRateId || null, lineTotal, taxAmount };
  });
  return { lines, subtotal: money(subtotal), taxTotal: money(taxTotal), total: money(subtotal + taxTotal) };
}

function validateHeader(b, { dueField }) {
  if (!b.contactId) throw new ApiError(400, 'Contact is required');
  if (!isDate(b.issueDate)) throw new ApiError(400, 'Valid issue date is required');
  if (b[dueField] && !isDate(b[dueField])) throw new ApiError(400, `Valid ${dueField} is required`);
  const rate = b.exchangeRate === undefined || b.exchangeRate === '' ? 1 : Number(b.exchangeRate);
  if (!(rate > 0)) throw new ApiError(400, 'Invalid exchange rate');
  return { currency: (b.currency || 'ZAR').toUpperCase().slice(0, 3), exchangeRate: rate };
}

async function nextNumber(client, orgId, table, prefix) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))::text AS locked', [`${table}:${orgId}`]);
  const r = await client.query(`SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '\\D', '', 'g'), '')::int), 0) + 1 AS n FROM ${table} WHERE organization_id=$1`, [orgId]);
  const col = { invoices: 'invoice_prefix', bills: 'bill_prefix', quotes: 'quote_prefix', credit_notes: 'credit_note_prefix' }[table];
  const p = col ? (await client.query(`SELECT ${col} AS p FROM organizations WHERE id=$1`, [orgId])).rows[0]?.p : null;
  return `${p || prefix}-${String(r.rows[0].n).padStart(4, '0')}`;
}

async function insertLines(client, table, fk, parentId, lines) {
  for (const l of lines) {
    await client.query(`INSERT INTO ${table} (${fk}, description, quantity, unit_price, account_id, tax_rate_id, line_total, tax_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [parentId, l.description, l.quantity, l.unitPrice, l.accountId, l.taxRateId, l.lineTotal, l.taxAmount]);
  }
}
async function termsDays(client, orgId) { return (await client.query('SELECT default_terms_days AS d FROM organizations WHERE id=$1', [orgId])).rows[0]?.d ?? 30; }
export { priceLines, validateHeader, nextNumber, insertLines, termsDays };
