/**
 * Customer portal links: a secret address per customer that shows their open invoices and statement and lets them pay,
 * without an account. Only a SHA-256 hash of the secret is stored, links expire after a year and can be turned off.
 */
import crypto from 'crypto';
import { ApiError } from '../utils/helpers';
import type { Queryable } from '../db';

const hash = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
export const portalUrl = (token: string) => `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/portal/${token}`;

/** A new link for this customer. Earlier links keep working (they may sit in sent emails) unless revoked. */
export async function createPortalLink(c: Queryable, orgId: string, contactId: string, userId: string | null = null) {
  if (!(await c.query('SELECT 1 FROM contacts WHERE id=$1 AND organization_id=$2', [contactId, orgId])).rowCount) throw new ApiError(404, 'Customer not found');
  const token = crypto.randomBytes(24).toString('base64url');
  await c.query('INSERT INTO portal_links (organization_id, contact_id, token_hash, created_by) VALUES ($1,$2,$3,$4)', [orgId, contactId, hash(token), userId]);
  return { token, url: portalUrl(token) };
}
export async function revokePortalLinks(c: Queryable, orgId: string, contactId: string) {
  return (await c.query('UPDATE portal_links SET revoked_at=now() WHERE organization_id=$1 AND contact_id=$2 AND revoked_at IS NULL', [orgId, contactId])).rowCount;
}
/** Which company and customer a link belongs to. Unknown, revoked and expired links all answer the same way. */
export async function resolvePortalLink(c: Queryable, token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(token || ''))) throw new ApiError(404, 'This link is not valid any more. Ask for a new one.');
  const row = (await c.query('UPDATE portal_links SET last_used_at=now() WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > now() RETURNING organization_id, contact_id', [hash(token)])).rows[0];
  if (!row) throw new ApiError(404, 'This link is not valid any more. Ask for a new one.');
  return { orgId: row.organization_id as string, contactId: row.contact_id as string };
}
