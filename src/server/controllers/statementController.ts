import { ApiError } from '../utils/helpers';
import { buildStatement } from '../services/statementService';
import { createPortalLink, revokePortalLinks } from '../services/portalService';
import { renderStatement } from '../utils/pdf'; import { sendMail } from '../utils/mailer';

const R = (n: number) => 'R' + Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fileName = (s) => `Statement ${s.contact.name.replace(/[^\w -]+/g, '')} ${s.to}.pdf`;

/** GET /contacts/:id/statement?from=&to= */
async function get(req, res, c) { res.json({ statement: await buildStatement(c, req.user.orgId, req.params.id, req.query) }); }
async function pdf(req, res, c) {
  const s = await buildStatement(c, req.user.orgId, req.params.id, req.query); const buf = await renderStatement(s);
  res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${fileName(s)}"`); res.send(buf);
}
/** Emails the statement PDF, with a link to the customer portal where they can pay. */
async function email(req, res, c) {
  const s = await buildStatement(c, req.user.orgId, req.params.id, req.body || {});
  // body.from/body.to are the statement period; body.email overrides the customer's address.
  const to = String(req.body?.email || s.contact.email || '').trim(); if (!/^\S+@\S+\.\S+$/.test(to)) throw new ApiError(400, 'Add an email address for this customer, or type one in');
  const link = (await createPortalLink(c, req.user.orgId, req.params.id, req.user.userId)).url;
  const text = String(req.body?.message || '').trim() || `Hi ${s.contact.name},\n\nPlease find your statement for ${s.from} to ${s.to} attached. The balance due is ${R(s.closingBalance)}.\n\nYou can see your invoices and pay online here:\n${link}\n\n${s.organization.name}`;
  await sendMail({ to, subject: `Statement from ${s.organization.name}`, text, attachments: [{ filename: fileName(s), content: await renderStatement(s) }] });
  res.json({ ok: true, sentTo: to });
}
/** A portal link to copy or share on WhatsApp; and turning every link for this customer off. */
async function portalLink(req, res, c) { res.status(201).json(await createPortalLink(c, req.user.orgId, req.params.id, req.user.userId)); }
async function revokePortal(req, res, c) { res.json({ revoked: await revokePortalLinks(c, req.user.orgId, req.params.id) }); }
export { get, pdf, email, portalLink, revokePortal };
