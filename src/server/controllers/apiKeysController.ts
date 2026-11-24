import { ApiError, toCamel } from '../utils/helpers';
import { newKey } from '../services/apiKeyService';

const COLS = 'id, name, prefix, access, created_by, created_at, last_used_at, revoked_at';
async function list(req, res, c) {
  const r = await c.query(`SELECT k.${COLS.split(', ').join(', k.')}, u.name AS created_by_name FROM api_keys k LEFT JOIN users u ON u.id=k.created_by WHERE k.organization_id=$1 ORDER BY k.revoked_at IS NOT NULL, k.created_at DESC`, [req.user.orgId]);
  res.json({ apiKeys: toCamel(r.rows) });
}
/** The full key is returned only here, once. */
async function create(req, res, c) {
  const name = String(req.body?.name || '').trim(), access = req.body?.access === 'WRITE' ? 'WRITE' : req.body?.access === 'READ' ? 'READ' : null;
  if (!name || name.length > 80) throw new ApiError(400, 'Give the key a name of up to 80 characters, such as the app that will use it');
  if (!access) throw new ApiError(400, 'Choose read-only or read-and-write access');
  const active = (await c.query('SELECT count(*)::int AS n FROM api_keys WHERE organization_id=$1 AND revoked_at IS NULL', [req.user.orgId])).rows[0].n;
  if (active >= 20) throw new ApiError(400, 'A company can have up to 20 active API keys. Revoke one you no longer use first.');
  const k = newKey();
  const r = await c.query(`INSERT INTO api_keys (organization_id, name, prefix, key_hash, access, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${COLS}`, [req.user.orgId, name, k.prefix, k.hash, access, req.user.userId]);
  res.status(201).json({ apiKey: toCamel(r.rows[0]), key: k.key });
}
async function revoke(req, res, c) {
  const r = await c.query(`UPDATE api_keys SET revoked_at=now() WHERE id=$1 AND organization_id=$2 AND revoked_at IS NULL RETURNING ${COLS}`, [req.params.id, req.user.orgId]);
  if (!r.rowCount) throw new ApiError(404, 'API key not found or already revoked');
  res.json({ apiKey: toCamel(r.rows[0]) });
}
export { list, create, revoke };
