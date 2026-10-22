/** Products and services: a price list for document lines, and for stock-tracked products the quantity on hand at average cost. */
import { ApiError, toCamel, money, today } from '../utils/helpers';
import { accountByCode, getAccountBalances } from '../utils/ledger';
import { adjustStock } from '../services/stockService';

const COLS = 'i.*, CASE WHEN i.qty_on_hand > 0 THEN round(i.stock_value / i.qty_on_hand, 2) ELSE NULL END AS average_cost';
async function list(req, res, c) {
  const r = await c.query(`SELECT ${COLS} FROM items i WHERE i.organization_id=$1 AND ($2::boolean OR i.is_active) ORDER BY i.code`, [req.user.orgId, req.query.all === '1']);
  res.json({ items: toCamel(r.rows) });
}
async function get(req, res, c) {
  const it = (await c.query(`SELECT ${COLS} FROM items i WHERE i.id=$1 AND i.organization_id=$2`, [req.params.id, req.user.orgId])).rows[0];
  if (!it) throw new ApiError(404, 'Product not found');
  const moves = (await c.query(`SELECT m.*, COALESCE(inv.number, b.number) AS document_number FROM stock_movements m
      LEFT JOIN invoices inv ON m.source_table='invoices' AND inv.id=m.source_id LEFT JOIN bills b ON m.source_table='bills' AND b.id=m.source_id
     WHERE m.item_id=$1 ORDER BY m.date DESC, m.created_at DESC LIMIT 200`, [it.id])).rows;
  res.json({ item: toCamel(it), movements: toCamel(moves) });
}

/** Checks a product's fields. Accounts default from the chart: Sales, Cost of Sales, and Inventory for stock. */
async function clean(c, orgId, b, existing: any = null) {
  const v: any = { ...(existing ? toCamel(existing) : {}), ...b };
  const code = String(v.code || '').trim().slice(0, 40), name = String(v.name || '').trim().slice(0, 200);
  if (!code) throw new ApiError(400, 'Enter a product code (for example SKU or a short name)');
  if (!name) throw new ApiError(400, 'Enter the product name');
  const num = (x, label) => { if (x === undefined || x === null || x === '') return null; const n = Number(x); if (!isFinite(n) || n < 0) throw new ApiError(400, `${label} must be 0 or more`); return n; };
  const acct = async (id, type: string[] | null, label) => {
    if (!id) return null;
    const a = (await c.query('SELECT id, type FROM accounts WHERE id=$1 AND organization_id=$2 AND is_active', [id, orgId])).rows[0];
    if (!a || (type && !type.includes(a.type))) throw new ApiError(400, `Choose a valid ${label}`); return a.id;
  };
  const rate = async (id) => { if (!id) return null; if (!(await c.query('SELECT 1 FROM tax_rates WHERE id=$1 AND organization_id=$2', [id, orgId])).rowCount) throw new ApiError(400, 'Unknown VAT rate'); return id; };
  const track = !!v.trackStock;
  if (existing && existing.track_stock && !track && Number(existing.qty_on_hand) !== 0) throw new ApiError(409, 'Count this product down to 0 before turning stock tracking off');
  const out = {
    code, name, description: v.description ? String(v.description).slice(0, 1000) : null, unit: v.unit ? String(v.unit).slice(0, 20) : null,
    salePrice: num(v.salePrice, 'Selling price'), purchasePrice: num(v.purchasePrice, 'Cost price'), reorderLevel: num(v.reorderLevel, 'Reorder level'),
    saleAccountId: await acct(v.saleAccountId, ['REVENUE'], 'sales account') || await accountByCode(c, orgId, '4000'),
    purchaseAccountId: await acct(v.purchaseAccountId, track ? ['ASSET'] : ['EXPENSE', 'ASSET'], track ? 'stock account (an asset)' : 'purchases account'),
    cogsAccountId: await acct(v.cogsAccountId, ['EXPENSE'], 'cost of sales account'),
    saleTaxRateId: await rate(v.saleTaxRateId), purchaseTaxRateId: await rate(v.purchaseTaxRateId), trackStock: track, isActive: v.isActive !== false,
  };
  if (track) { out.purchaseAccountId ||= await accountByCode(c, orgId, '1200'); out.cogsAccountId ||= await accountByCode(c, orgId, '5000'); }
  // The stock account holds what stock cost; changing it while there is stock would leave that value behind in the old account.
  if (existing && existing.track_stock && Number(existing.stock_value) !== 0 && out.purchaseAccountId !== existing.purchase_account_id) throw new ApiError(409, 'The stock account cannot change while there is stock on hand');
  return out;
}
const FIELDS = ['code', 'name', 'description', 'unit', 'sale_price', 'purchase_price', 'reorder_level', 'sale_account_id', 'purchase_account_id', 'cogs_account_id', 'sale_tax_rate_id', 'purchase_tax_rate_id', 'track_stock', 'is_active'];
const values = (o) => [o.code, o.name, o.description, o.unit, o.salePrice, o.purchasePrice, o.reorderLevel, o.saleAccountId, o.purchaseAccountId, o.cogsAccountId, o.saleTaxRateId, o.purchaseTaxRateId, o.trackStock, o.isActive];
const dupe = (e) => { if (/unique|duplicate/i.test(e.message)) throw new ApiError(409, 'Another product already has that code'); throw e; };

async function create(req, res, c) {
  const orgId = req.user.orgId; const o = await clean(c, orgId, req.body || {});
  const it = (await c.query(`INSERT INTO items (organization_id, ${FIELDS.join(', ')}) VALUES ($1, ${FIELDS.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING id`, [orgId, ...values(o)]).catch(dupe)).rows[0];
  // Opening stock given with the product: counted in at the cost price.
  const openingQty = Number(req.body?.openingQuantity || 0);
  if (o.trackStock && openingQty > 0) await adjustStock(c, orgId, it.id, { reason: 'OPENING', newQuantity: openingQty, unitCost: req.body.openingUnitCost ?? o.purchasePrice ?? 0, date: req.body.openingDate || today() }, req.user.userId);
  res.status(201).json({ item: toCamel((await c.query(`SELECT ${COLS} FROM items i WHERE i.id=$1`, [it.id])).rows[0]) });
}
async function update(req, res, c) {
  const orgId = req.user.orgId; const ex = (await c.query('SELECT * FROM items WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, orgId])).rows[0];
  if (!ex) throw new ApiError(404, 'Product not found');
  const o = await clean(c, orgId, req.body || {}, ex);
  await c.query(`UPDATE items SET ${FIELDS.map((f, i) => `${f}=$${i + 2}`).join(', ')} WHERE id=$1`, [ex.id, ...values(o)]).catch(dupe);
  res.json({ item: toCamel((await c.query(`SELECT ${COLS} FROM items i WHERE i.id=$1`, [ex.id])).rows[0]) });
}
async function adjust(req, res, c) {
  const r = await adjustStock(c, req.user.orgId, req.params.id, req.body || {}, req.user.userId);
  res.status(201).json({ ...r, item: toCamel((await c.query(`SELECT ${COLS} FROM items i WHERE i.id=$1`, [req.params.id])).rows[0]) });
}
/** Stock on hand at cost, checked against the stock accounts in the ledger. */
async function valuation(req, res, c) {
  const orgId = req.user.orgId; const asAt = req.query.date || null;
  const rows = asAt
    ? (await c.query(`SELECT i.id, i.code, i.name, i.unit, i.reorder_level, i.purchase_account_id, COALESCE(SUM(m.quantity),0) AS qty_on_hand, COALESCE(SUM(m.value),0) AS stock_value
         FROM items i LEFT JOIN stock_movements m ON m.item_id=i.id AND m.date <= $2 WHERE i.organization_id=$1 AND i.track_stock GROUP BY i.id ORDER BY i.code`, [orgId, asAt])).rows
    : (await c.query('SELECT id, code, name, unit, reorder_level, purchase_account_id, qty_on_hand, stock_value FROM items WHERE organization_id=$1 AND track_stock ORDER BY code', [orgId])).rows;
  const accountIds = [...new Set(rows.map((r) => r.purchase_account_id))];
  const balances = (await getAccountBalances(c, orgId, { to: asAt })).filter((a) => accountIds.includes(a.id));
  const total = money(rows.reduce((s, r) => s + Number(r.stock_value), 0)), ledger = money(balances.reduce((s, a) => s + a.balance, 0));
  res.json({ asAt: asAt || today(), items: toCamel(rows.map((r) => ({ ...r, average_cost: Number(r.qty_on_hand) > 0 ? money(r.stock_value / r.qty_on_hand) : null, low: r.reorder_level !== null && Number(r.qty_on_hand) <= Number(r.reorder_level) }))),
    total, ledgerBalance: ledger, accounts: balances.map((a) => ({ code: a.code, name: a.name, balance: a.balance })), agrees: Math.abs(total - ledger) < 0.005 });
}
export { list, get, create, update, adjust, valuation };
