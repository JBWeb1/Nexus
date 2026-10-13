/**
 * Receipts: snap or upload a receipt, Claude reads it, the user checks it, and it becomes an approved bill (paid now from
 * a bank account, or left owing) with the photo attached as the tax invoice SARS asks for.
 */
import { ApiError, money, isDate, newId, toCamel } from '../utils/helpers';
import { authPool } from '../db';
import { putFile, storageMode } from '../utils/storage';
import { readReceipt, receiptsConfigured } from '../services/receiptService';
import { nextNumber } from '../utils/documents';
import { approveBill } from './billsController';
import { recordBillPayment } from '../services/paymentsService';

const FUEL = /\b(fuel|petrol|diesel|engen|shell|sasol|caltex|bp|astron|total ?energies)\b/i;
const TYPES = /^(image\/(jpe?g|png|webp|gif)|application\/pdf)$/;

/** POST /receipts/read (multipart "file"): keeps the file, reads it, and suggests supplier, account, VAT and duplicates. */
async function read(req, res, c) {
  const f = req.file; if (!f) throw new ApiError(400, 'Choose a photo or PDF of the receipt');
  if (!TYPES.test(f.mimetype)) throw new ApiError(400, 'Upload a photo (JPEG, PNG or WebP) or a PDF of the receipt');
  const orgId = req.user.orgId;
  // Keep the file first, so it can still be saved with a bill typed in by hand if reading fails.
  // Without file storage (S3/R2 on serverless hosting) the receipt is still read; it just is not kept.
  let att = null;
  if (storageMode() !== 'none') {
    const safe = (f.originalname || 'receipt').replace(/[^\w.\- ]+/g, '_').slice(-120) || 'receipt'; const key = `${orgId}/${newId('f')}/${safe}`;
    await putFile(key, f.buffer, f.mimetype);
    const u = (await authPool.query('SELECT name FROM users WHERE id=$1', [req.user.userId])).rows[0];
    att = (await c.query("INSERT INTO attachments (organization_id, entity_type, entity_id, filename, content_type, size, storage_key, uploaded_by, uploaded_by_name) VALUES ($1,'GENERAL',NULL,$2,$3,$4,$5,$6,$7) RETURNING id",
      [orgId, safe, f.mimetype, f.size, key, req.user.userId, u?.name || null])).rows[0];
  }
  const accounts = (await c.query("SELECT id, code, name FROM accounts WHERE organization_id=$1 AND type='EXPENSE' AND is_active ORDER BY code", [orgId])).rows;
  let reading = null, readError = null;
  try { reading = await readReceipt(f, accounts); } catch (e: any) { readError = e.message; }
  const suggestions: any = { contactId: null, accountId: null, taxRateId: null, duplicateOf: null };
  if (reading) {
    const byVat = reading.supplierVatNumber && (await c.query("SELECT id FROM contacts WHERE organization_id=$1 AND replace(vat_number,' ','')=$2 LIMIT 1", [orgId, reading.supplierVatNumber])).rows[0];
    const byName = reading.supplierName && (await c.query("SELECT id FROM contacts WHERE organization_id=$1 AND lower(name)=lower($2) LIMIT 1", [orgId, reading.supplierName])).rows[0];
    suggestions.contactId = (byVat || byName)?.id || null;
    suggestions.accountId = accounts.find((a) => a.code === reading.accountCode)?.id || accounts.find((a) => a.code === '6900')?.id || null;
    const org = (await c.query('SELECT vat_registered FROM organizations WHERE id=$1', [orgId])).rows[0];
    const rates = (await c.query('SELECT id, name, rate FROM tax_rates WHERE organization_id=$1', [orgId])).rows;
    const std = rates.find((r) => Number(r.rate) === 15), zero = rates.find((r) => /zero/i.test(r.name));
    // VAT can only be claimed by a VAT vendor holding a valid tax invoice; fuel is zero-rated.
    if (org?.vat_registered) suggestions.taxRateId = FUEL.test(`${reading.supplierName} ${reading.description}`) || !(reading.vatAmount > 0) ? zero?.id || null : reading.isTaxInvoice ? std?.id || null : null;
    if (reading.total && reading.date) suggestions.duplicateOf = (await c.query(`SELECT b.id, b.number FROM bills b WHERE b.organization_id=$1 AND b.status <> 'VOID' AND b.issue_date=$2 AND b.total=$3
       AND ($4::text IS NULL OR b.contact_id=$4) LIMIT 1`, [orgId, reading.date, reading.total, suggestions.contactId])).rows[0] || null;
  }
  res.json({ attachmentId: att?.id || null, stored: !!att, configured: receiptsConfigured(), reading, readError, suggestions: toCamel(suggestions) });
}

/**
 * Bill lines that add up exactly to the receipt. With a printed VAT amount the standard-rated part is worked back from it
 * and anything left (zero-rated items such as bread or milk on a till slip) goes on a second, zero-rated line.
 */
export function receiptLines({ total, vatAmount, rate, zeroRateId, taxRateId, accountId, description }) {
  total = money(total);
  if (!taxRateId || !(rate > 0)) return [{ description, quantity: 1, unitPrice: total, accountId, taxRateId: taxRateId || null }];
  const exact = (net: number) => money(net + money(net * rate / 100)) === total;
  const fullNet = money(total / (1 + rate / 100));
  const vatPrinted = vatAmount > 0 ? money(vatAmount) : null;
  const expectedVat = money(total - fullNet);
  if (vatPrinted !== null && zeroRateId && vatPrinted < expectedVat - 0.05) {
    let stdNet = money(vatPrinted * 100 / rate); const rest = money(total - stdNet - money(stdNet * rate / 100));
    if (rest > 0) return [{ description, quantity: 1, unitPrice: stdNet, accountId, taxRateId }, { description: `${description} (zero-rated items)`, quantity: 1, unitPrice: rest, accountId, taxRateId: zeroRateId }];
  }
  // Nudge by a cent so net + rounded VAT lands exactly on the printed total.
  const net = [fullNet, money(fullNet - 0.01), money(fullNet + 0.01)].find(exact) ?? fullNet;
  return [{ description, quantity: 1, unitPrice: net, accountId, taxRateId }];
}

/** POST /receipts/save: the checked receipt becomes an approved bill, paid now or owing, with the file attached. */
async function save(req, res, c) {
  const orgId = req.user.orgId, b = req.body || {};
  const total = money(b.total); if (!(total > 0)) throw new ApiError(400, 'Enter the total from the receipt');
  if (!isDate(b.date)) throw new ApiError(400, 'Enter the date on the receipt');
  const description = String(b.description || '').trim() || 'Receipt';
  const acc = (await c.query("SELECT id FROM accounts WHERE id=$1 AND organization_id=$2 AND type='EXPENSE'", [b.accountId, orgId])).rows[0]; if (!acc) throw new ApiError(400, 'Choose an expense account');
  const att = b.attachmentId ? (await c.query("SELECT id FROM attachments WHERE id=$1 AND organization_id=$2 AND entity_id IS NULL", [b.attachmentId, orgId])).rows[0] : null;
  if (b.attachmentId && !att) throw new ApiError(400, 'That receipt file was already saved, or does not exist');
  // Supplier: the one chosen, else found by name, else added.
  let contactId = b.contactId && (await c.query('SELECT id FROM contacts WHERE id=$1 AND organization_id=$2', [b.contactId, orgId])).rows[0]?.id;
  const name = String(b.supplierName || '').trim();
  if (!contactId) { if (!name) throw new ApiError(400, 'Enter the supplier name');
    contactId = (await c.query('SELECT id FROM contacts WHERE organization_id=$1 AND lower(name)=lower($2) LIMIT 1', [orgId, name])).rows[0]?.id
      || (await c.query("INSERT INTO contacts (organization_id, name, type, vat_number) VALUES ($1,$2,'SUPPLIER',$3) RETURNING id", [orgId, name, b.supplierVatNumber || null])).rows[0].id; }
  const rates = (await c.query('SELECT id, name, rate FROM tax_rates WHERE organization_id=$1', [orgId])).rows;
  const rate = rates.find((r) => r.id === b.taxRateId); if (b.taxRateId && !rate) throw new ApiError(400, 'Unknown VAT rate');
  const lines = receiptLines({ total, vatAmount: Number(b.vatAmount) || 0, rate: Number(rate?.rate || 0), zeroRateId: rates.find((r) => /zero/i.test(r.name))?.id, taxRateId: b.taxRateId || null, accountId: acc.id, description });
  // The supplier's own number when it is free, so the bill can be matched to their statement.
  const ref = String(b.documentNumber || '').trim().slice(0, 60);
  const number = ref && !(await c.query('SELECT 1 FROM bills WHERE organization_id=$1 AND number=$2', [orgId, ref])).rowCount ? ref : await nextNumber(c, orgId, 'bills', 'BILL');
  let sub = 0, tax = 0; const priced = lines.map((l) => { const lt = money(l.unitPrice), ta = l.taxRateId ? money(lt * Number(rates.find((r) => r.id === l.taxRateId)?.rate || 0) / 100) : 0; sub += lt; tax += ta; return { ...l, lineTotal: lt, taxAmount: ta }; });
  const bill = (await c.query(`INSERT INTO bills (organization_id, contact_id, number, issue_date, due_date, currency, exchange_rate, subtotal, tax_total, total, notes) VALUES ($1,$2,$3,$4,$4,'ZAR',1,$5,$6,$7,$8) RETURNING *`,
    [orgId, contactId, number, b.date, money(sub), money(tax), money(sub + tax), ref && ref !== number ? `Supplier reference ${ref}` : 'From a receipt'])).rows[0];
  for (const l of priced) await c.query('INSERT INTO bill_lines (bill_id, description, quantity, unit_price, account_id, tax_rate_id, line_total, tax_amount) VALUES ($1,$2,1,$3,$4,$5,$6,$7)', [bill.id, l.description, l.unitPrice, l.accountId, l.taxRateId, l.lineTotal, l.taxAmount]);
  await approveBill(c, orgId, bill.id, req.user.userId);
  if (b.bankAccountId) await recordBillPayment(c, { orgId, billId: bill.id, bankAccountId: b.bankAccountId, amount: money(sub + tax), date: b.date, reference: ref || null, userId: req.user.userId });
  if (att) await c.query("UPDATE attachments SET entity_type='BILL', entity_id=$2 WHERE id=$1", [att.id, bill.id]);
  const saved = (await c.query('SELECT id, number, total::float AS total, tax_total::float AS tax_total, status FROM bills WHERE id=$1', [bill.id])).rows[0];
  res.status(201).json({ bill: toCamel(saved), lines: priced.length });
}
export { read, save };
