import { ApiError,money } from '../utils/helpers';
import { postJournalEntry,reverseJournalEntry,accountByCode } from '../utils/ledger';
import { notifyPaymentReceived } from './whatsappService';

async function bankLedgerAccount(client, orgId, bankAccountId) {
  const r = await client.query('SELECT account_id FROM bank_accounts WHERE id=$1 AND organization_id=$2', [bankAccountId, orgId]);
  if (!r.rowCount) throw new ApiError(400, 'Unknown bank account');
  return r.rows[0].account_id;
}

/** Shared by the authenticated endpoint AND the Paystack webhook. Dr Bank (net) + Dr Fees = Cr AR (gross).
 *  Amount is in the invoice's currency; ledger value = amount x the invoice's exchange rate. */
async function recordInvoicePayment(client, { orgId, invoiceId, bankAccountId, amount, feeAmount = 0, date, reference = null, gateway = null, gatewayReference = null, userId = null }) {
  amount = money(amount); feeAmount = money(feeAmount);
  if (!(amount > 0)) throw new ApiError(400, 'Amount must be positive');
  if (feeAmount < 0 || feeAmount >= amount) throw new ApiError(400, 'Invalid fee amount');
  if (gatewayReference) {
    const dup = await client.query('SELECT * FROM payments WHERE gateway=$1 AND gateway_reference=$2', [gateway, gatewayReference]);
    if (dup.rowCount) return { payment: dup.rows[0], duplicate: true };
  }
  const inv = (await client.query('SELECT * FROM invoices WHERE id=$1 AND organization_id=$2 FOR UPDATE', [invoiceId, orgId])).rows[0];
  if (!inv) throw new ApiError(404, 'Invoice not found');
  if (!['SENT', 'PARTIAL'].includes(inv.status)) throw new ApiError(409, `Cannot record payment against a ${inv.status} invoice`);
  const outstanding = money(inv.total - inv.amount_paid);
  if (amount > outstanding + 0.005) throw new ApiError(400, `Payment exceeds outstanding balance (${outstanding})`);
  const bankAcc = await bankLedgerAccount(client, orgId, bankAccountId);
  const ar = await accountByCode(client, orgId, '1100');
  const rate = inv.exchange_rate, base = money(amount * rate), baseFee = money(feeAmount * rate);
  const lines: any[] = [{ accountId: bankAcc, debit: money(base - baseFee), description: `Payment ${inv.number}` }];
  if (baseFee > 0) lines.push({ accountId: await accountByCode(client, orgId, '6410'), debit: baseFee, description: `Processing fee ${inv.number}` });
  lines.push({ accountId: ar, credit: base, description: `Payment ${inv.number}` });
  const je = await postJournalEntry(client, { orgId, date, description: `Payment received ${inv.number}`, sourceType: 'RECEIPT', sourceTable: 'invoices', sourceId: invoiceId, lines, createdBy: userId });
  const p = (await client.query(
    `INSERT INTO payments (organization_id, type, invoice_id, bank_account_id, amount, fee_amount, date, reference, gateway, gateway_reference, journal_entry_id)
     VALUES ($1,'RECEIPT',$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [orgId, invoiceId, bankAccountId, amount, feeAmount, date, reference, gateway, gatewayReference, je.id])).rows[0];
  const paid = money(inv.amount_paid + amount);
  await client.query('UPDATE invoices SET amount_paid=$2, status=$3 WHERE id=$1', [invoiceId, paid, invoiceStatusFor(inv.total, paid, inv.credit_total)]);
  const contact = (await client.query('SELECT name, phone FROM contacts WHERE id=$1', [inv.contact_id])).rows[0];
  notifyPaymentReceived(contact, inv, amount).catch(() => {});
  return { payment: p, duplicate: false };
}

async function recordBillPayment(client, { orgId, billId, bankAccountId, amount, date, reference = null, userId = null }) {
  amount = money(amount);
  if (!(amount > 0)) throw new ApiError(400, 'Amount must be positive');
  const bill = (await client.query('SELECT * FROM bills WHERE id=$1 AND organization_id=$2 FOR UPDATE', [billId, orgId])).rows[0];
  if (!bill) throw new ApiError(404, 'Bill not found');
  if (!['APPROVED', 'PARTIAL'].includes(bill.status)) throw new ApiError(409, `Cannot pay a ${bill.status} bill`);
  const outstanding = money(bill.total - bill.amount_paid);
  if (amount > outstanding + 0.005) throw new ApiError(400, `Payment exceeds outstanding balance (${outstanding})`);
  const bankAcc = await bankLedgerAccount(client, orgId, bankAccountId);
  const ap = await accountByCode(client, orgId, '2000'); const base = money(amount * bill.exchange_rate);
  const je = await postJournalEntry(client, { orgId, date, description: `Payment made ${bill.number}`, sourceType: 'PAYMENT', sourceTable: 'bills', sourceId: billId, createdBy: userId,
    lines: [{ accountId: ap, debit: base }, { accountId: bankAcc, credit: base }] });
  const p = (await client.query(`INSERT INTO payments (organization_id, type, bill_id, bank_account_id, amount, date, reference, journal_entry_id) VALUES ($1,'PAYMENT',$2,$3,$4,$5,$6,$7) RETURNING *`,
    [orgId, billId, bankAccountId, amount, date, reference, je.id])).rows[0];
  const paid = money(bill.amount_paid + amount);
  await client.query('UPDATE bills SET amount_paid=$2, status=$3 WHERE id=$1', [billId, paid, paid >= bill.total - 0.005 ? 'PAID' : 'PARTIAL']);
  return { payment: p };
}

async function reversePayment(client, { orgId, paymentId, userId, date }) {
  const p = (await client.query('SELECT * FROM payments WHERE id=$1 AND organization_id=$2 FOR UPDATE', [paymentId, orgId])).rows[0];
  if (!p) throw new ApiError(404, 'Payment not found');
  if (p.status === 'REVERSED') throw new ApiError(409, 'Payment is already reversed');
  await reverseJournalEntry(client, { orgId, entryId: p.journal_entry_id, date, createdBy: userId });
  await client.query("UPDATE payments SET status='REVERSED' WHERE id=$1", [paymentId]);
  if (p.invoice_id) {
    const inv = (await client.query('SELECT total, amount_paid, credit_total FROM invoices WHERE id=$1 FOR UPDATE', [p.invoice_id])).rows[0];
    const paid = Math.max(0, money(inv.amount_paid - p.amount));
    await client.query('UPDATE invoices SET amount_paid=$2, status=$3 WHERE id=$1', [p.invoice_id, paid, invoiceStatusFor(inv.total, paid, inv.credit_total)]);
  } else if (p.bill_id) {
    const b = (await client.query('SELECT total, amount_paid FROM bills WHERE id=$1 FOR UPDATE', [p.bill_id])).rows[0];
    const paid = Math.max(0, money(b.amount_paid - p.amount));
    await client.query('UPDATE bills SET amount_paid=$2, status=$3 WHERE id=$1', [p.bill_id, paid, paid <= 0 ? 'APPROVED' : 'PARTIAL']);
  }
  return { ...p, status: 'REVERSED' };
}
/** amount_paid includes credit notes, so balances are right everywhere; this picks the label. */
function invoiceStatusFor(total, paid, credit = 0) { if (paid >= total - 0.005) return credit >= total - 0.005 ? 'CREDITED' : 'PAID'; return paid > 0.005 ? 'PARTIAL' : 'SENT'; }
export { invoiceStatusFor, recordInvoicePayment, recordBillPayment, reversePayment };
