/**
 * The customer portal (no sign-in): /api/portal/:token. Runs on the service pool, which sees every company, so every query
 * below is limited by hand to the company and customer the link belongs to.
 */
import { ApiError } from '../utils/helpers';
import { resolvePortalLink } from '../services/portalService';
import { buildStatement } from '../services/statementService';
import { renderStatement } from '../utils/pdf';
import { invoicePdfBuffer, invoicePayLink } from './documentExtrasController';

async function summary(req, res, c) {
  const { orgId, contactId } = await resolvePortalLink(c, req.params.token);
  const s = await buildStatement(c, orgId, contactId, { from: req.query.from, to: req.query.to });
  res.json({ statement: s, canPayOnline: !!process.env.PAYSTACK_SECRET_KEY });
}
async function statementPdf(req, res, c) {
  const { orgId, contactId } = await resolvePortalLink(c, req.params.token);
  const s = await buildStatement(c, orgId, contactId, { from: req.query.from, to: req.query.to });
  res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `inline; filename="Statement ${s.to}.pdf"`); res.send(await renderStatement(s));
}
const own = async (c, orgId, contactId, invoiceId) => {
  const inv = (await c.query("SELECT id, number FROM invoices WHERE id=$1 AND organization_id=$2 AND contact_id=$3 AND status NOT IN ('DRAFT','VOID')", [invoiceId, orgId, contactId])).rows[0];
  if (!inv) throw new ApiError(404, 'Invoice not found'); return inv;
};
async function invoicePdf(req, res, c) {
  const { orgId, contactId } = await resolvePortalLink(c, req.params.token); const inv = await own(c, orgId, contactId, req.params.id);
  const { buf } = await invoicePdfBuffer(c, orgId, inv.id);
  res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `inline; filename="${inv.number}.pdf"`); res.send(buf);
}
async function pay(req, res, c) {
  const { orgId, contactId } = await resolvePortalLink(c, req.params.token); const inv = await own(c, orgId, contactId, req.params.id);
  res.json(await invoicePayLink(c, orgId, inv.id));
}
export { summary, statementPdf, invoicePdf, pay };
