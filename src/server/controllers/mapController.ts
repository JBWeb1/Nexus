/** The contacts map: where customers and suppliers are, and what each owes you or you owe them. */
import { ApiError } from '../utils/helpers';
import { geocode } from '../services/geocodeService';

const num = (v: any) => (v == null ? null : Number(v));
async function contacts(req, res, c) {
  const r = await c.query(`
    SELECT ct.id, ct.name, ct.type, ct.address, ct.phone, ct.email, ct.latitude, ct.longitude, ct.location_source,
      COALESCE(i.owed, 0) AS owed_to_you, COALESCE(i.overdue, 0) AS overdue_to_you, COALESCE(i.open_count, 0) AS open_invoices,
      COALESCE(b.owed, 0) AS you_owe, COALESCE(b.overdue, 0) AS overdue_you_owe
    FROM contacts ct
    LEFT JOIN (SELECT contact_id, SUM((total - amount_paid) * exchange_rate) AS owed, COUNT(*) AS open_count,
                 SUM(CASE WHEN due_date < CURRENT_DATE THEN (total - amount_paid) * exchange_rate ELSE 0 END) AS overdue
               FROM invoices WHERE organization_id=$1 AND status IN ('SENT','PARTIAL') GROUP BY contact_id) i ON i.contact_id=ct.id
    LEFT JOIN (SELECT contact_id, SUM((total - amount_paid) * exchange_rate) AS owed,
                 SUM(CASE WHEN due_date < CURRENT_DATE THEN (total - amount_paid) * exchange_rate ELSE 0 END) AS overdue
               FROM bills WHERE organization_id=$1 AND status IN ('APPROVED','PARTIAL') GROUP BY contact_id) b ON b.contact_id=ct.id
    WHERE ct.organization_id=$1 ORDER BY ct.name`, [req.user.orgId]);
  const r2 = (n: any) => Math.round(Number(n) * 100) / 100;
  res.json({ contacts: r.rows.map((x) => ({ id: x.id, name: x.name, type: x.type, address: x.address, phone: x.phone, email: x.email,
    latitude: num(x.latitude), longitude: num(x.longitude), locationSource: x.location_source,
    owedToYou: r2(x.owed_to_you), overdueToYou: r2(x.overdue_to_you), openInvoices: Number(x.open_invoices), youOwe: r2(x.you_owe), overdueYouOwe: r2(x.overdue_you_owe) })) });
}
async function find(c, req) {
  const ct = (await c.query('SELECT id, name, address FROM contacts WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.orgId])).rows[0];
  if (!ct) throw new ApiError(404, 'Contact not found'); return ct;
}
const save = (c, req, lat, lng, source) => c.query(`UPDATE contacts SET latitude=$3, longitude=$4, location_source=$5, located_at=CASE WHEN $5::text IS NULL THEN NULL ELSE now() END
    WHERE id=$1 AND organization_id=$2 RETURNING id, latitude, longitude, location_source`, [req.params.id, req.user.orgId, lat, lng, source]).then((r) => r.rows[0]);
const out = (x) => ({ id: x.id, latitude: num(x.latitude), longitude: num(x.longitude), locationSource: x.location_source });

/** Looks the contact's address up and pins it. */
async function locate(req, res, c) {
  const ct = await find(c, req);
  const place = await geocode(String(ct.address || ''));
  if (!place) throw new ApiError(422, `No map location was found for “${ct.address}”. Check the address, or place the pin by hand.`);
  res.json({ location: out(await save(c, req, place.latitude, place.longitude, 'ADDRESS')), match: place.label });
}
/** Places the pin by hand (a click on the map). */
async function place(req, res, c) {
  await find(c, req);
  const lat = Number(req.body?.latitude), lng = Number(req.body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new ApiError(400, 'latitude must be between -90 and 90 and longitude between -180 and 180');
  res.json({ location: out(await save(c, req, Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6, 'MANUAL')) });
}
async function clear(req, res, c) { await find(c, req); res.json({ location: out(await save(c, req, null, null, null)) }); }
export { contacts, locate, place, clear };
