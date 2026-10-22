import { ApiError,toCamel } from '../utils/helpers';
const TYPES = ['GENERAL', 'INVOICE', 'BILL', 'QUOTE', 'CONTACT', 'PERIOD', 'PURCHASE_ORDER', 'PROJECT', 'ITEM'];
const TABLE = { INVOICE: 'invoices', BILL: 'bills', QUOTE: 'quotes', CONTACT: 'contacts', PURCHASE_ORDER: 'purchase_orders', PROJECT: 'projects', ITEM: 'items' };
const SEL = 'id, entity_type, entity_id, title, body, pinned, created_by_name, created_at, updated_at';

async function checkTarget(c, orgId, type, id) {
  if (type === 'GENERAL') { if (id) throw new ApiError(400, 'A general note has no linked item'); return; }
  if (!id) throw new ApiError(400, 'Choose what this note is about');
  if (type === 'PERIOD') { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(id)) throw new ApiError(400, 'Period must look like 2026-09'); return; }
  if (!(await c.query(`SELECT 1 FROM ${TABLE[type]} WHERE id=$1 AND organization_id=$2`, [id, orgId])).rowCount) throw new ApiError(404, 'That item was not found in this company');
}
async function list(req, res, c) {
  const { entityType, entityId, q } = req.query; const p = [req.user.orgId]; let w = 'organization_id=$1';
  if (entityType) { if (!TYPES.includes(entityType)) throw new ApiError(400, 'Unknown note type'); p.push(entityType); w += ` AND entity_type=$${p.length}`; }
  if (entityId) { p.push(entityId); w += ` AND entity_id=$${p.length}`; }
  if (q) { p.push(`%${String(q).trim().replace(/[%_]/g, '\\$&')}%`); w += ` AND (body ILIKE $${p.length} OR title ILIKE $${p.length})`; }
  const rows = (await c.query(`SELECT ${SEL} FROM notes WHERE ${w} ORDER BY pinned DESC, updated_at DESC LIMIT 300`, p)).rows;
  // Friendly label for what each note is attached to.
  const out = [];
  for (const r of rows) {
    let label = null;
    if (['INVOICE', 'BILL', 'QUOTE', 'PURCHASE_ORDER'].includes(r.entity_type)) label = (await c.query(`SELECT number FROM ${TABLE[r.entity_type]} WHERE id=$1`, [r.entity_id])).rows[0]?.number;
    else if (r.entity_type === 'CONTACT') label = (await c.query('SELECT name FROM contacts WHERE id=$1', [r.entity_id])).rows[0]?.name;
    else if (r.entity_type === 'PROJECT' || r.entity_type === 'ITEM') label = (await c.query(`SELECT name FROM ${TABLE[r.entity_type]} WHERE id=$1`, [r.entity_id])).rows[0]?.name;
    else if (r.entity_type === 'PERIOD') label = r.entity_id;
    out.push({ ...toCamel(r), label });
  }
  res.json({ notes: out });
}
async function create(req, res, c) {
  const b = req.body || {}; const type = b.entityType || 'GENERAL'; if (!TYPES.includes(type)) throw new ApiError(400, 'Unknown note type');
  if (!String(b.body || '').trim()) throw new ApiError(400, 'Write something in the note');
  if (String(b.body).length > 10000) throw new ApiError(400, 'Notes are limited to 10,000 characters');
  await checkTarget(c, req.user.orgId, type, type === 'GENERAL' ? null : b.entityId);
  const u = (await c.query('SELECT name FROM users WHERE id=$1', [req.user.userId])).rows[0];
  const r = await c.query(`INSERT INTO notes (organization_id, entity_type, entity_id, title, body, pinned, created_by, created_by_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${SEL}`,
    [req.user.orgId, type, type === 'GENERAL' ? null : b.entityId, b.title?.trim() || null, String(b.body).trim(), !!b.pinned, req.user.userId, u?.name || 'User']);
  res.status(201).json({ note: toCamel(r.rows[0]) });
}
async function update(req, res, c) {
  const n = (await c.query('SELECT * FROM notes WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId])).rows[0]; if (!n) throw new ApiError(404, 'Note not found');
  const b = req.body || {};
  if ((b.body !== undefined || b.title !== undefined) && n.created_by !== req.user.userId && !['OWNER', 'ADMIN'].includes(req.user.role)) throw new ApiError(403, 'Only the author or an admin can edit this note');
  if (b.body !== undefined && !String(b.body).trim()) throw new ApiError(400, 'A note cannot be empty');
  const r = await c.query(`UPDATE notes SET body=COALESCE($3,body), title=CASE WHEN $4::boolean THEN $5 ELSE title END, pinned=COALESCE($6,pinned), updated_at=now() WHERE id=$1 AND organization_id=$2 RETURNING ${SEL}`,
    [n.id, req.user.orgId, b.body !== undefined ? String(b.body).trim() : null, b.title !== undefined, b.title?.trim() || null, typeof b.pinned === 'boolean' ? b.pinned : null]);
  res.json({ note: toCamel(r.rows[0]) });
}
async function remove(req, res, c) {
  const n = (await c.query('SELECT created_by FROM notes WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId])).rows[0]; if (!n) throw new ApiError(404, 'Note not found');
  if (n.created_by !== req.user.userId && !['OWNER', 'ADMIN'].includes(req.user.role)) throw new ApiError(403, 'Only the author or an admin can delete this note');
  await c.query('DELETE FROM notes WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId]); res.json({ ok: true });
}
export { list, create, update, remove };
