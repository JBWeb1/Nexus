import type { Req, Res } from '../http';
import type { Queryable } from '../db';
import { authPool } from '../db';
import { ApiError, newId } from '../utils/helpers';
import { putFile, getFile, deleteFile, storageMode } from '../utils/storage';

const TYPES = ['INVOICE', 'BILL', 'QUOTE', 'CONTACT', 'GENERAL'];
const ALLOWED = /^(application\/pdf|image\/(png|jpe?g|webp|heic)|text\/(csv|plain)|application\/vnd\.(openxmlformats-officedocument\.(spreadsheetml\.sheet|wordprocessingml\.document)|ms-excel)|application\/msword)$/;
const shape = (a: any) => ({ id: a.id, entityType: a.entityType, entityId: a.entityId, filename: a.filename, contentType: a.contentType, size: a.size, uploadedByName: a.uploadedByName, createdAt: a.createdAt });

/** Uses the typed Prisma client. Row-level security still applies, because `c.prisma` is bound to the tenant transaction. */
export async function list(req: Req, res: Res, c: Queryable) {
  const { entityType, entityId } = req.query;
  const rows = await c.prisma.attachment.findMany({ where: { organizationId: req.user.orgId, ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}) }, orderBy: { createdAt: 'desc' } });
  res.json({ attachments: rows.map(shape), storage: storageMode() });
}
export async function upload(req: Req, res: Res, c: Queryable) {
  const f = req.file; if (!f) throw new ApiError(400, 'Choose a file to upload');
  const entityType = String(req.body.entityType || 'GENERAL'); if (!TYPES.includes(entityType)) throw new ApiError(400, 'Unknown attachment type');
  if (!ALLOWED.test(f.mimetype)) throw new ApiError(400, 'That file type is not supported. Use a PDF, image, spreadsheet, Word document or text file.');
  if (f.size === 0) throw new ApiError(400, 'That file is empty');
  const u = (await authPool.query('SELECT name FROM users WHERE id=$1', [req.user.userId])).rows[0];
  const safe = f.originalname.replace(/[^\w.\- ]+/g, '_').slice(-120) || 'file'; const key = `${req.user.orgId}/${newId('f')}/${safe}`;
  await putFile(key, f.buffer, f.mimetype);
  const a = await c.prisma.attachment.create({ data: { organizationId: req.user.orgId, entityType, entityId: req.body.entityId || null, filename: safe, contentType: f.mimetype, size: f.size, storageKey: key, uploadedBy: req.user.userId, uploadedByName: u?.name || 'User' } });
  res.status(201).json({ attachment: shape(a) });
}
export async function download(req: Req, res: Res, c: Queryable) {
  const a = await c.prisma.attachment.findFirst({ where: { id: req.params.id, organizationId: req.user.orgId } }); if (!a) throw new ApiError(404, 'File not found');
  const f = await getFile(a.storageKey, a.filename);
  if ('url' in f) return res.json({ url: f.url });
  res.setHeader('Content-Type', a.contentType); res.setHeader('Content-Disposition', `attachment; filename="${a.filename}"`); res.send(f.buffer);
}
export async function remove(req: Req, res: Res, c: Queryable) {
  const a = await c.prisma.attachment.findFirst({ where: { id: req.params.id, organizationId: req.user.orgId } }); if (!a) throw new ApiError(404, 'File not found');
  await c.prisma.attachment.delete({ where: { id: a.id } }); await deleteFile(a.storageKey).catch(() => {});
  res.json({ ok: true });
}
