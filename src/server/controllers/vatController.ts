import { ApiError,toCamel,money,isDate } from '../utils/helpers';
import { getAccountBalances,postJournalEntry,accountByCode } from '../utils/ledger';

async function compute(c, orgId, from, to) {
  if (!isDate(from) || !isDate(to) || to < from) throw new ApiError(400, 'Valid from/to dates are required');
  // The settlement entry that finalizing posts clears VAT Output/Input; it is not VAT activity, so a finalized period still shows its figures.
  const bal = await getAccountBalances(c, orgId, { from, to, excludeSourceTypes: ['VAT_SETTLEMENT'] });
  const out = bal.find((a) => a.code === '2100'), inn = bal.find((a) => a.code === '2110');
  const outputVat = money(out.credit - out.debit), inputVat = money(inn.debit - inn.credit);
  const sales = (await c.query(`SELECT COALESCE(SUM(l.line_total*i.exchange_rate),0) AS std FROM invoice_lines l JOIN invoices i ON i.id=l.invoice_id
     WHERE i.organization_id=$1 AND i.status IN ('SENT','PARTIAL','PAID','CREDITED') AND NOT i.opening_balance AND i.issue_date BETWEEN $2 AND $3 AND l.tax_amount > 0`, [orgId, from, to])).rows[0].std;
  const zero = (await c.query(`SELECT COALESCE(SUM(l.line_total*i.exchange_rate),0) AS z FROM invoice_lines l JOIN invoices i ON i.id=l.invoice_id
     WHERE i.organization_id=$1 AND i.status IN ('SENT','PARTIAL','PAID','CREDITED') AND NOT i.opening_balance AND i.issue_date BETWEEN $2 AND $3 AND l.tax_amount = 0`, [orgId, from, to])).rows[0].z;
  const cn = async (taxed) => Number((await c.query(`SELECT COALESCE(SUM(l.line_total*n.exchange_rate),0) AS v FROM credit_note_lines l JOIN credit_notes n ON n.id=l.credit_note_id
     WHERE n.organization_id=$1 AND n.status='POSTED' AND n.issue_date BETWEEN $2 AND $3 AND ${taxed ? 'l.tax_amount > 0' : 'l.tax_amount = 0'}`, [orgId, from, to])).rows[0].v);
  const stdNet = money(Number(sales) - await cn(true)), zeroNet = money(Number(zero) - await cn(false));
  const purch = (await c.query(`SELECT COALESCE(SUM(l.line_total*b.exchange_rate),0) AS p FROM bill_lines l JOIN bills b ON b.id=l.bill_id
     WHERE b.organization_id=$1 AND b.status IN ('APPROVED','PARTIAL','PAID') AND NOT b.opening_balance AND b.issue_date BETWEEN $2 AND $3 AND l.tax_amount > 0`, [orgId, from, to])).rows[0].p;
  return { periodStart: from, periodEnd: to, standardRatedSales: stdNet, zeroRatedSales: zeroNet, standardRatedPurchases: money(purch), outputVat, inputVat, netVat: money(outputVat - inputVat) };
}
const preview = async (req, res, c) => res.json({ vat201: await compute(c, req.user.orgId, req.query.from, req.query.to) });
const listPeriods = async (req, res, c) => res.json({ vatPeriods: toCamel((await c.query('SELECT * FROM vat_periods WHERE organization_id=$1 ORDER BY period_start DESC', [req.user.orgId])).rows) });

/** Posts one balanced settlement entry (Dr Output, Cr Input, net to SARS Payable), records the period, THEN locks it. */
async function finalize(req, res, c) {
  const orgId = req.user.orgId, { periodStart, periodEnd } = req.body || {};
  const v = await compute(c, orgId, periodStart, periodEnd);
  if (v.outputVat === 0 && v.inputVat === 0) throw new ApiError(400, 'No VAT activity in this period to settle');
  const lock = (await c.query('SELECT locked_through FROM period_locks WHERE organization_id=$1', [orgId])).rows[0];
  if (lock && periodEnd <= lock.locked_through) throw new ApiError(409, `Period is locked through ${lock.locked_through}`);
  const vp = (await c.query(`INSERT INTO vat_periods (organization_id, period_start, period_end, status, output_vat, input_vat, net_vat) VALUES ($1,$2,$3,'FINALIZED',$4,$5,$6) RETURNING *`,
    [orgId, periodStart, periodEnd, v.outputVat, v.inputVat, v.netVat])).rows[0]; // exclusion constraint rejects overlaps (23P01 -> 409)
  const lines = [];
  if (v.outputVat > 0) lines.push({ accountId: await accountByCode(c, orgId, '2100'), debit: v.outputVat, description: 'VAT Output cleared' });
  else if (v.outputVat < 0) lines.push({ accountId: await accountByCode(c, orgId, '2100'), credit: -v.outputVat });
  if (v.inputVat > 0) lines.push({ accountId: await accountByCode(c, orgId, '2110'), credit: v.inputVat, description: 'VAT Input cleared' });
  else if (v.inputVat < 0) lines.push({ accountId: await accountByCode(c, orgId, '2110'), debit: -v.inputVat });
  const sars = await accountByCode(c, orgId, '2120');
  if (v.netVat > 0) lines.push({ accountId: sars, credit: v.netVat, description: `VAT201 ${periodStart} to ${periodEnd}` });
  else if (v.netVat < 0) lines.push({ accountId: sars, debit: -v.netVat, description: `VAT refund due ${periodStart} to ${periodEnd}` });
  const je = await postJournalEntry(c, { orgId, date: periodEnd, description: `VAT201 settlement ${periodStart} to ${periodEnd}`, sourceType: 'VAT_SETTLEMENT', sourceTable: 'vat_periods', sourceId: vp.id, lines, createdBy: req.user.userId });
  await c.query('UPDATE vat_periods SET journal_entry_id=$2 WHERE id=$1', [vp.id, je.id]);
  await c.query(`INSERT INTO period_locks (organization_id, locked_through) VALUES ($1,$2) ON CONFLICT (organization_id) DO UPDATE SET locked_through=GREATEST(period_locks.locked_through, EXCLUDED.locked_through), updated_at=now()`, [orgId, periodEnd]);
  res.status(201).json({ vatPeriod: toCamel({ ...vp, journal_entry_id: je.id }) });
}
export { preview, listPeriods, finalize, compute };
