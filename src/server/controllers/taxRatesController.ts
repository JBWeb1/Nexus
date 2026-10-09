import type { Req, Res } from '../http';
import { plain, type Queryable } from '../db';
import { ApiError } from '../utils/helpers';

// Typed Prisma queries. `c.prisma` is bound to the tenant transaction, so row-level security still limits every query to this company.
export async function list(req: Req, res: Res, c: Queryable) {
  res.json({ taxRates: plain(await c.prisma.taxRate.findMany({ where: { organizationId: req.user.orgId }, orderBy: [{ rate: 'desc' }, { name: 'asc' }] })) });
}
export async function create(req: Req, res: Res, c: Queryable) {
  const { name, rate } = req.body || {}; const r = Number(rate);
  if (!name?.trim() || !isFinite(r) || r < 0 || r > 100) throw new ApiError(400, 'Name and a rate between 0 and 100 are required');
  res.status(201).json({ taxRate: plain(await c.prisma.taxRate.create({ data: { organizationId: req.user.orgId, name: name.trim(), rate: r } })) });
}
export async function remove(req: Req, res: Res, c: Queryable) {
  const id = req.params.id;
  if (!(await c.prisma.taxRate.findFirst({ where: { id, organizationId: req.user.orgId }, select: { id: true } }))) throw new ApiError(404, 'Tax rate not found');
  const [inv, bill, quote] = await Promise.all([c.prisma.invoiceLine.count({ where: { taxRateId: id } }), c.prisma.billLine.count({ where: { taxRateId: id } }), c.prisma.quoteLine.count({ where: { taxRateId: id } })]);
  if (inv + bill + quote > 0) throw new ApiError(409, 'Tax rate is used by existing documents');
  await c.prisma.taxRate.delete({ where: { id } }); res.json({ ok: true });
}
