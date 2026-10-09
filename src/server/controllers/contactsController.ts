import type { Req, Res } from '../http';
import { plain, type Queryable } from '../db';
import { ApiError } from '../utils/helpers';

const TYPES = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
function clean(b: any, partial: boolean) {
  if (!partial && !b.name?.trim()) throw new ApiError(400, 'Name is required');
  if (b.type && !TYPES.includes(b.type)) throw new ApiError(400, 'Invalid contact type');
  if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) throw new ApiError(400, 'Invalid email address');
  return b;
}
// Typed Prisma queries. `c.prisma` is bound to the tenant transaction, so row-level security still limits every query to this company.
export async function list(req: Req, res: Res, c: Queryable) {
  const type = TYPES.includes(req.query.type) ? req.query.type : null;
  const rows = await c.prisma.contact.findMany({ where: { organizationId: req.user.orgId, ...(type ? { type: { in: [type, 'BOTH'] } } : {}) }, orderBy: { name: 'asc' } });
  res.json({ contacts: plain(rows) });
}
export async function get(req: Req, res: Res, c: Queryable) {
  const row = await c.prisma.contact.findFirst({ where: { id: req.params.id, organizationId: req.user.orgId } });
  if (!row) throw new ApiError(404, 'Contact not found'); res.json({ contact: plain(row) });
}
export async function create(req: Req, res: Res, c: Queryable) {
  const b = clean(req.body || {}, false);
  const row = await c.prisma.contact.create({ data: { organizationId: req.user.orgId, name: b.name.trim(), email: b.email || null, phone: b.phone || null, address: b.address || null, vatNumber: b.vatNumber || null, type: b.type || 'CUSTOMER' } });
  res.status(201).json({ contact: plain(row) });
}
export async function update(req: Req, res: Res, c: Queryable) {
  const b = clean(req.body || {}, true);
  if (!(await c.prisma.contact.findFirst({ where: { id: req.params.id, organizationId: req.user.orgId }, select: { id: true } }))) throw new ApiError(404, 'Contact not found');
  // Only the fields that were sent are changed.
  const data = { ...(b.name?.trim() ? { name: b.name.trim() } : {}), ...(b.email != null ? { email: b.email } : {}), ...(b.phone != null ? { phone: b.phone } : {}), ...(b.address != null ? { address: b.address } : {}), ...(b.vatNumber != null ? { vatNumber: b.vatNumber } : {}), ...(b.type ? { type: b.type } : {}) };
  res.json({ contact: plain(await c.prisma.contact.update({ where: { id: req.params.id }, data })) });
}
export async function remove(req: Req, res: Res, c: Queryable) {
  const r = await c.prisma.contact.deleteMany({ where: { id: req.params.id, organizationId: req.user.orgId } });
  if (!r.count) throw new ApiError(404, 'Contact not found'); res.json({ ok: true });
}
