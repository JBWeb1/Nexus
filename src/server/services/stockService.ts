/**
 * Stock on hand at average cost. Each tracked product keeps its quantity and the total cost of that quantity, so the
 * average cost is value / quantity. Buying adds quantity and cost; selling takes quantity out at the average cost and
 * charges that cost to cost of sales in the same journal entry as the sale. Every change is a stock movement, and the
 * stock accounts in the ledger always equal the value of stock on hand.
 */
import { ApiError, money, isDate } from '../utils/helpers';
import { postJournalEntry, accountByCode } from '../utils/ledger';

const qty4 = (n) => Math.round((Number(n) + Number.EPSILON) * 10000) / 10000;
const fmtQty = (n) => String(Number(qty4(n)));

async function lockItems(c, orgId: string, ids: string[]) {
  if (!ids.length) return new Map();
  const rows = (await c.query('SELECT * FROM items WHERE organization_id=$1 AND id = ANY($2::text[]) ORDER BY id FOR UPDATE', [orgId, ids])).rows;
  return new Map(rows.map((r) => [r.id, { ...r, qty_on_hand: Number(r.qty_on_hand), stock_value: Number(r.stock_value) }]));
}
/** The cost of taking `qty` out of stock at the average cost. Taking the last unit takes all the remaining value. */
export const costOut = (onHand: number, value: number, qty: number) => (qty4(qty) >= qty4(onHand) ? money(value) : money((value * qty) / onHand));

type Move = { itemId: string; kind: string; quantity: number; value: number; lineId?: string | null; projectId?: string | null; note?: string | null };
async function record(c, orgId: string, items: Map<string, any>, moves: Move[], { date, sourceTable, sourceId, journalEntryId, userId }) {
  for (const m of moves) {
    await c.query(`INSERT INTO stock_movements (organization_id, item_id, date, kind, quantity, value, source_table, source_id, line_id, project_id, journal_entry_id, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [orgId, m.itemId, date, m.kind, qty4(m.quantity), money(m.value), sourceTable, sourceId, m.lineId || null, m.projectId || null, journalEntryId, m.note || null, userId]);
  }
  for (const it of items.values()) await c.query('UPDATE items SET qty_on_hand=$2, stock_value=$3 WHERE id=$1', [it.id, qty4(it.qty_on_hand), money(it.stock_value)]);
}

/**
 * Before an invoice is posted: takes its stock lines out of stock. Returns the cost-of-sales journal lines to add to
 * the sale's entry, and `commit(journalEntryId)` to save the movements once that entry exists.
 */
export async function takeSaleStock(c, orgId: string, inv, lines) {
  const ids = [...new Set(lines.map((l) => l.item_id).filter(Boolean))] as string[];
  const items = await lockItems(c, orgId, ids); const moves: Move[] = []; const dr = new Map(), cr = new Map();
  for (const l of lines) {
    const it = l.item_id && items.get(l.item_id); if (!it?.track_stock) continue;
    const q = Number(l.quantity);
    if (qty4(q) > qty4(it.qty_on_hand)) throw new ApiError(409, `Not enough ${it.name} in stock: ${fmtQty(it.qty_on_hand)} on hand, this invoice needs ${fmtQty(q)}. Record the purchase or a stock count first.`);
    const cost = costOut(it.qty_on_hand, it.stock_value, q);
    it.qty_on_hand = qty4(it.qty_on_hand - q); it.stock_value = money(it.stock_value - cost);
    moves.push({ itemId: it.id, kind: 'SALE', quantity: -q, value: -cost, lineId: l.id, projectId: l.project_id });
    if (cost > 0) { dr.set(it.cogs_account_id, money((dr.get(it.cogs_account_id) || 0) + cost)); cr.set(it.purchase_account_id, money((cr.get(it.purchase_account_id) || 0) + cost)); }
  }
  const jl = [...[...dr].map(([accountId, debit]) => ({ accountId, debit, description: `Cost of sales ${inv.number}` })),
    ...[...cr].map(([accountId, credit]) => ({ accountId, credit, description: `Stock sold ${inv.number}` }))];
  return { jl, commit: (journalEntryId: string, userId: string | null) => record(c, orgId, items, moves, { date: inv.issue_date, sourceTable: 'invoices', sourceId: inv.id, journalEntryId, userId }) };
}

/** After a bill is posted: its stock lines (already debited to the stock account) are added to stock at their cost in rand. */
export async function addPurchaseStock(c, orgId: string, bill, lines, journalEntryId: string, userId: string | null) {
  const ids = [...new Set(lines.map((l) => l.item_id).filter(Boolean))] as string[];
  const items = await lockItems(c, orgId, ids); const moves: Move[] = [];
  for (const l of lines) {
    const it = l.item_id && items.get(l.item_id); if (!it?.track_stock) continue;
    const q = Number(l.quantity), value = money(Number(l.line_total) * Number(bill.exchange_rate));
    it.qty_on_hand = qty4(it.qty_on_hand + q); it.stock_value = money(it.stock_value + value);
    moves.push({ itemId: it.id, kind: 'PURCHASE', quantity: q, value, lineId: l.id, projectId: l.project_id });
  }
  if (moves.length) await record(c, orgId, items, moves, { date: bill.issue_date, sourceTable: 'bills', sourceId: bill.id, journalEntryId, userId });
}

/**
 * When an invoice or bill is voided: puts stock back exactly as it was moved (same quantity and cost). The ledger side is
 * undone by reversing the document's journal entry. A bill can only be voided while its stock is still on hand.
 */
export async function reverseDocumentStock(c, orgId: string, sourceTable: 'invoices' | 'bills', sourceId: string, date: string, journalEntryId: string | null, userId: string | null) {
  const done = (await c.query('SELECT item_id, line_id, project_id, quantity, value FROM stock_movements WHERE organization_id=$1 AND source_table=$2 AND source_id=$3', [orgId, sourceTable, sourceId])).rows;
  if (!done.length) return;
  const net = new Map<string, { q: number; v: number; projectId: string | null; lineId: string | null }>();
  for (const m of done) { const k = `${m.item_id}|${m.line_id || ''}`; const x = net.get(k) || { q: 0, v: 0, projectId: m.project_id, lineId: m.line_id }; x.q = qty4(x.q + Number(m.quantity)); x.v = money(x.v + Number(m.value)); net.set(k, x); }
  const items = await lockItems(c, orgId, [...new Set(done.map((m) => m.item_id))] as string[]); const moves: Move[] = [];
  for (const [k, x] of net) {
    if (x.q === 0 && x.v === 0) continue;
    const it = items.get(k.split('|')[0]);
    if (qty4(it.qty_on_hand - x.q) < 0) throw new ApiError(409, `${fmtQty(x.q)} ${it.name} from this bill ${x.q === 1 ? 'has' : 'have'} been sold or used since (${fmtQty(it.qty_on_hand)} on hand). Record a stock count or a credit note instead.`);
    it.qty_on_hand = qty4(it.qty_on_hand - x.q); it.stock_value = money(it.stock_value - x.v);
    moves.push({ itemId: it.id, kind: 'VOID', quantity: -x.q, value: -x.v, lineId: x.lineId, projectId: x.projectId });
  }
  await record(c, orgId, items, moves, { date, sourceTable, sourceId, journalEntryId, userId });
}

/**
 * A stock count, write-off or opening stock: sets the quantity on hand to `newQuantity`. Stock found is added at
 * `unitCost` (default: the average cost, else the purchase price); stock missing is taken out at the average cost.
 * The difference goes to `accountId`: by default cost of sales for counts, owner's equity for opening stock.
 */
export async function adjustStock(c, orgId: string, itemId: string, b: any, userId: string | null) {
  const items = await lockItems(c, orgId, [itemId]); const it = items.get(itemId);
  if (!it) throw new ApiError(404, 'Product not found'); if (!it.track_stock) throw new ApiError(400, 'This product does not track stock. Turn on stock tracking first.');
  const date = b.date; if (!isDate(date)) throw new ApiError(400, 'Enter the date of the count');
  const target = Number(b.newQuantity); if (!isFinite(target) || target < 0) throw new ApiError(400, 'Enter the quantity counted (0 or more)');
  const opening = b.reason === 'OPENING'; const diff = qty4(target - it.qty_on_hand);
  if (diff === 0) throw new ApiError(400, `The quantity on hand is already ${fmtQty(target)}`);
  let value: number;
  if (diff > 0) {
    const avg = it.qty_on_hand > 0 ? it.stock_value / it.qty_on_hand : Number(it.purchase_price || 0);
    const unit = b.unitCost === undefined || b.unitCost === '' || b.unitCost === null ? avg : Number(b.unitCost);
    if (!isFinite(unit) || unit < 0) throw new ApiError(400, 'Enter the cost per unit');
    value = money(diff * unit);
  } else value = -costOut(it.qty_on_hand, it.stock_value, -diff);
  const other = b.accountId ? (await c.query('SELECT id FROM accounts WHERE id=$1 AND organization_id=$2 AND is_active', [b.accountId, orgId])).rows[0]?.id : await accountByCode(c, orgId, opening ? '3000' : '5000');
  if (!other) throw new ApiError(400, 'Unknown account');
  if (other === it.purchase_account_id) throw new ApiError(400, 'Choose an account other than the stock account');
  const why = String(b.note || '').trim() || (opening ? 'Opening stock' : diff > 0 ? 'Stock count: more on hand' : 'Stock count: less on hand');
  let je = null;
  if (value !== 0) {
    const desc = `${why}: ${it.name} (${diff > 0 ? '+' : ''}${fmtQty(diff)})`; const amt = Math.abs(value);
    je = await postJournalEntry(c, { orgId, date, description: desc, sourceType: 'JOURNAL', sourceTable: 'items', sourceId: it.id, createdBy: userId,
      lines: value > 0 ? [{ accountId: it.purchase_account_id, debit: amt, description: desc }, { accountId: other, credit: amt, description: desc }] : [{ accountId: other, debit: amt, description: desc }, { accountId: it.purchase_account_id, credit: amt, description: desc }] });
  }
  it.qty_on_hand = target; it.stock_value = money(it.stock_value + value);
  await record(c, orgId, items, [{ itemId: it.id, kind: opening ? 'OPENING' : 'ADJUSTMENT', quantity: diff, value, note: why }], { date, sourceTable: 'items', sourceId: it.id, journalEntryId: je?.id || null, userId });
  return { quantity: diff, value };
}
