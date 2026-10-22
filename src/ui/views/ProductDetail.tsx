"use client";
import { PageSkeleton } from "../components/ui/skeleton";
import { useEffect, useState } from "react"; import { Link, useParams } from "@/ui/lib/router";
import { api } from "../api/client"; import Panel from "../components/Panel"; import Button from "../components/Button"; import Money from "../components/Money"; import ErrorNote from "../components/ErrorNote";
import { ItemForm } from "./Products"; import { toast } from "../components/Toaster";

const today = () => new Date().toISOString().slice(0, 10);
const qty = (n) => Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 4 });
const KIND = { PURCHASE: "Bought", SALE: "Sold", ADJUSTMENT: "Stock count", OPENING: "Opening stock", VOID: "Voided" };
const LINK = { invoices: "/invoices", bills: "/bills" };

/** One product: edit it, count its stock, and see every stock movement with its cost. */
export default function ProductDetail() {
  const { id } = useParams(); const [d, setD] = useState(null); const [error, setError] = useState(null); const [editing, setEditing] = useState(false);
  const [count, setCount] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => api.get(`/items/${id}`).then(setD).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);
  async function saveCount(e) {
    e.preventDefault(); setBusy(true); setError(null);
    try { await api.post(`/items/${id}/adjust`, { ...count, newQuantity: Number(count.newQuantity), unitCost: count.unitCost === "" ? undefined : Number(count.unitCost) }); setCount(null); toast("Stock count saved and posted"); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  if (!d) return (error ? <div className="text-brick">{error}</div> : <PageSkeleton />);
  const it = d.item; const low = it.trackStock && it.reorderLevel !== null && Number(it.qtyOnHand) <= Number(it.reorderLevel);
  const rising = count && Number(count.newQuantity) > Number(it.qtyOnHand);
  return (<div className="space-y-6 max-w-5xl">
    <div className="flex items-start justify-between flex-wrap gap-3"><div><Link to="/products" className="text-sm text-ink-soft hover:underline">← Products</Link>
      <h1 className="font-display text-3xl mt-1"><span className="figure">{it.code}</span> {it.name}</h1>{!it.isActive && <p className="text-sm text-ink-soft">Inactive</p>}</div>
      <div className="flex gap-2">{it.trackStock && <Button variant="gold" onClick={() => setCount(count ? null : { newQuantity: String(Number(it.qtyOnHand)), date: today(), unitCost: "", note: "", reason: Number(it.qtyOnHand) === 0 && d.movements.length === 0 ? "OPENING" : "COUNT" })}>{count ? "Close" : "Stock count"}</Button>}
        <Button variant="secondary" onClick={() => setEditing((x) => !x)}>{editing ? "Close" : "Edit"}</Button></div></div>
    <ErrorNote error={error} />
    {editing && <Panel title="Edit product"><ItemForm isNew={false} initial={it} onSaved={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} /></Panel>}
    {count && <Panel title="Stock count"><form onSubmit={saveCount} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div><label className="label">Quantity counted</label><input required type="number" step="any" min="0" className="field figure" value={count.newQuantity} onChange={(e) => setCount({ ...count, newQuantity: e.target.value })} /><p className="text-xs text-ink-soft mt-1">Nexus has {qty(it.qtyOnHand)}.</p></div>
      <div><label className="label">Date</label><input required type="date" className="field figure" value={count.date} onChange={(e) => setCount({ ...count, date: e.target.value })} /></div>
      <div><label className="label">Reason</label><select className="field" value={count.reason} onChange={(e) => setCount({ ...count, reason: e.target.value })}><option value="COUNT">Stock count, damage or loss (cost of sales)</option><option value="OPENING">Opening stock (owner's equity)</option></select></div>
      {rising ? <div><label className="label">Cost per unit for the extra</label><input type="number" step="0.01" min="0" className="field figure" placeholder={it.averageCost ?? it.purchasePrice ?? "0"} value={count.unitCost} onChange={(e) => setCount({ ...count, unitCost: e.target.value })} /></div> : <div />}
      <div className="md:col-span-3"><label className="label">Note (optional)</label><input className="field" placeholder="e.g. Month-end count, 2 damaged" value={count.note} onChange={(e) => setCount({ ...count, note: e.target.value })} /></div>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save count"}</Button></form>
      <p className="text-xs text-ink-soft mt-3">Stock missing is written off at the average cost; stock found is added at the cost you enter. Either way the journal is posted for you.</p></Panel>}
    <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-4">
      <Panel><div className="text-sm text-ink-soft">Selling price</div><div className="text-xl mt-1">{it.salePrice !== null ? <Money amount={it.salePrice} /> : "—"}</div></Panel>
      <Panel><div className="text-sm text-ink-soft">Cost price</div><div className="text-xl mt-1">{it.purchasePrice !== null ? <Money amount={it.purchasePrice} /> : "—"}</div></Panel>
      {it.trackStock ? <><Panel><div className="text-sm text-ink-soft">On hand</div><div className={`text-xl mt-1 figure ${low ? "text-brick" : ""}`}>{qty(it.qtyOnHand)}{it.unit ? ` ${it.unit}` : ""}</div>{low && <div className="text-xs text-brick">At or below the reorder level ({qty(it.reorderLevel)}). <Link className="underline" to="/purchase-orders/new">Order more</Link></div>}</Panel>
        <Panel><div className="text-sm text-ink-soft">Stock value (average cost {it.averageCost !== null ? <Money amount={it.averageCost} /> : "—"})</div><div className="text-xl mt-1"><Money amount={it.stockValue} /></div></Panel></>
        : <Panel className="md:col-span-2"><div className="text-sm text-ink-soft">Stock</div><div className="text-sm mt-1">Not tracked. Turn on "Track stock on hand" under Edit for products you keep in stock.</div></Panel>}
    </div>
    {it.trackStock && <Panel title="Stock history">{d.movements.length === 0 ? <p className="text-sm text-ink-soft">No stock movements yet. Approve a bill with this product, or do a stock count, to put stock on hand.</p> : (
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">What</th><th className="pb-2 font-normal">Document</th><th className="pb-2 font-normal text-right">Quantity</th><th className="pb-2 font-normal text-right">Cost</th></tr></thead>
        <tbody>{d.movements.map((m) => <tr key={m.id} className="ledger-rule"><td className="py-2 figure text-ink-soft">{m.date}</td><td>{KIND[m.kind] || m.kind}{m.note && m.note !== KIND[m.kind] ? <span className="text-ink-soft"> · {m.note}</span> : ""}</td>
          <td>{m.documentNumber && LINK[m.sourceTable] ? <Link className="text-primary hover:underline figure" to={`${LINK[m.sourceTable]}/${m.sourceId}`}>{m.documentNumber}</Link> : "—"}</td>
          <td className={`text-right figure ${m.quantity < 0 ? "text-brick" : "text-success"}`}>{m.quantity > 0 ? "+" : ""}{qty(m.quantity)}</td><td className="text-right"><Money amount={m.value} /></td></tr>)}</tbody></table></div>)}</Panel>}
  </div>);
}
