import { ApiError,toCamel,today,isDate } from '../utils/helpers';
import * as svc from '../services/paymentsService';
function body(b) {
  const date = b.date || today(); if (!isDate(date)) throw new ApiError(400, 'Invalid date');
  if (!b.bankAccountId) throw new ApiError(400, 'Bank account is required'); return { date, amount: Number(b.amount), bankAccountId: b.bankAccountId, reference: b.reference || null };
}
async function payInvoice(req, res, c) {
  const b = body(req.body || {});
  const r = await svc.recordInvoicePayment(c, { orgId: req.user.orgId, invoiceId: req.body.invoiceId, feeAmount: Number(req.body.feeAmount || 0), userId: req.user.userId, ...b });
  res.status(201).json({ payment: toCamel(r.payment) });
}
async function payBill(req, res, c) {
  const b = body(req.body || {});
  const r = await svc.recordBillPayment(c, { orgId: req.user.orgId, billId: req.body.billId, userId: req.user.userId, ...b });
  res.status(201).json({ payment: toCamel(r.payment) });
}
async function reverse(req, res, c) {
  const p = await svc.reversePayment(c, { orgId: req.user.orgId, paymentId: req.params.id, userId: req.user.userId, date: isDate(req.body?.date) ? req.body.date : today() });
  res.json({ payment: toCamel(p) });
}
export { payInvoice, payBill, reverse };
