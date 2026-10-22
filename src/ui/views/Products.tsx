"use client";
import { useEffect, useState } from "react"; import { Link, useNavigate } from "@/ui/lib/router";
import { api } from "../api/client"; import Panel from "../components/Panel"; import Button from "../components/Button"; import Money from "../components/Money"; import ErrorNote from "../components/ErrorNote"; import { toast } from "../components/Toaster"; import EmptyState from "../components/EmptyState"; import { SkeletonRows } from "../components/ui/skeleton"; import { Package } from "lucide-react";

const qty = (n) => Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 4 });
export const blankItem = { code: "", name: "", description: "", unit: "", salePrice: "", purchasePrice: "", saleAccountId: "", purchaseAccountId: "", cogsAccountId: "", saleTaxRateId: "", purchaseTaxRateId: "", trackStock: false, reorderLevel: "", openingQuantity: "", isActive: true };

/** The add/edit form for a product or service. Stock-tracked products also take a stock account, a cost of sales account and opening stock. */
export function ItemForm({ initial = blankItem as any, onSaved, onCancel = null, isNew = true }) {
  const [f, setF] = useState({ ...blankItem, ...initial }); const [ref, setRef] = useState({ accounts: [], taxRates: [] }); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { Promise.all([api.get("/accounts"), api.get("/tax-rates")]).then(([a, t]) => {
    setRef({ accounts: a.accounts.filter((x) => x.isActive), taxRates: t.taxRates });
    if (isNew) { const def = t.taxRates.find((x) => x.isDefault)?.id || ""; setF((x) => ({ ...x, saleTaxRateId: x.saleTaxRateId || def, purchaseTaxRateId: x.purchaseTaxRateId || def })); }
  }).catch((e) => setError(e.message)); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const of = (types) => ref.accounts.filter((a) => types.includes(a.type));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(null);
    const body: any = { ...f }; for (const k of ["salePrice", "purchasePrice", "reorderLevel", "openingQuantity"]) body[k] = f[k] === "" || f[k] === null ? null : Number(f[k]);
    for (const k of ["saleAccountId", "purchaseAccountId", "cogsAccountId", "saleTaxRateId", "purchaseTaxRateId"]) body[k] = f[k] || null;
    try { const d = isNew ? await api.post("/items", body) : await api.patch(`/items/${initial.id}`, body); toast(isNew ? `${d.item.name} added` : "Product saved"); onSaved(d.item); } catch (err) { setError(err.message); setBusy(false); }
  }
  const select = (k, label, list, empty) => <div><label className="label">{label}</label><select className="field" value={f[k] || ""} onChange={set(k)}><option value="">{empty}</option>{list.map((a) => <option key={a.id} value={a.id}>{a.code ? `${a.code} ${a.name}` : a.name}</option>)}</select></div>;
  return (<form onSubmit={submit} className="space-y-4"><ErrorNote error={error} />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div><label className="label">Code</label><input required className="field" placeholder="e.g. COF-1KG" value={f.code} onChange={set("code")} /></div>
      <div className="md:col-span-2"><label className="label">Name</label><input required className="field" value={f.name} onChange={set("name")} /></div>
      <div><label className="label">Unit (optional)</label><input className="field" placeholder="each, kg, hour" value={f.unit || ""} onChange={set("unit")} /></div>
      <div><label className="label">Selling price (excl. VAT)</label><input type="number" step="0.01" min="0" className="field figure" value={f.salePrice ?? ""} onChange={set("salePrice")} /></div>
      {select("saleAccountId", "Sales account", of(["REVENUE"]), "4000 Sales (default)")}
      {select("saleTaxRateId", "VAT when selling", ref.taxRates, "No VAT")}
      <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.trackStock} onChange={set("trackStock")} /> Track stock on hand</label></div>
      <div><label className="label">Cost price (excl. VAT)</label><input type="number" step="0.01" min="0" className="field figure" value={f.purchasePrice ?? ""} onChange={set("purchasePrice")} /></div>
      {f.trackStock ? <>{select("purchaseAccountId", "Stock account", of(["ASSET"]), "1200 Inventory (default)")}{select("cogsAccountId", "Cost of sales account", of(["EXPENSE"]), "5000 Cost of Sales (default)")}</>
        : <>{select("purchaseAccountId", "Purchases account", of(["EXPENSE"]), "Choose on each bill")}<div /></>}
      {select("purchaseTaxRateId", "VAT when buying", ref.taxRates, "No VAT")}
      {f.trackStock && <div><label className="label">Reorder when down to</label><input type="number" step="any" min="0" className="field figure" value={f.reorderLevel ?? ""} onChange={set("reorderLevel")} /></div>}
      {f.trackStock && isNew && <div><label className="label">Opening stock (quantity)</label><input type="number" step="any" min="0" className="field figure" value={f.openingQuantity} onChange={set("openingQuantity")} /><p className="text-xs text-ink-soft mt-1">Counted in at the cost price.</p></div>}
      {!isNew && <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={set("isActive")} /> Active (shown on new documents)</label></div>}
      <div className="md:col-span-4"><label className="label">Description (optional)</label><input className="field" value={f.description || ""} onChange={set("description")} /></div>
    </div>
    {f.trackStock && <p className="text-xs text-ink-soft">Stock bought on bills goes to the stock account at what it cost. When it is sold, its average cost moves to cost of sales, so your profit is right without a stock take every month.</p>}
    <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? "Saving…" : isNew ? "Add product" : "Save changes"}</Button>{onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}</div></form>);
}

export default function Products() {
  const nav = useNavigate(); const [items, setItems] = useState(null); const [val, setVal] = useState(null); const [error, setError] = useState(null); const [adding, setAdding] = useState(false); const [q, setQ] = useState(""); const [all, setAll] = useState(false);
  const load = () => Promise.all([api.get(`/items${all ? "?all=1" : ""}`), api.get("/reports/stock-valuation")]).then(([i, v]) => { setItems(i.items); setVal(v); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [all]);
  const shown = (items || []).filter((i) => !q || `${i.code} ${i.name}`.toLowerCase().includes(q.toLowerCase()));
  const low = (val?.items || []).filter((i) => i.low);
  return (<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3"><h1 className="font-display text-3xl">Products &amp; services</h1>
      <div className="flex gap-2"><Link to="/purchase-orders/new"><Button variant="secondary">New purchase order</Button></Link><Button variant="gold" onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "New product"}</Button></div></div>
    <ErrorNote error={error} />
    {adding && <Panel title="New product or service"><ItemForm onSaved={(it) => { setAdding(false); nav(`/products/${it.id}`); }} onCancel={() => setAdding(false)} /></Panel>}
    {val && val.items.length > 0 && <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-4">
      <Panel><div className="text-sm text-ink-soft">Stock on hand at cost</div><div className="text-2xl mt-1"><Money animate amount={val.total} /></div>
        <div className={`text-xs mt-1 ${val.agrees ? "text-success" : "text-ink-soft"}`}>{val.agrees ? "Agrees with the stock account in the ledger" : <>Ledger stock account: <Money amount={val.ledgerBalance} />. The difference is stock posted without a product (for example an opening balance journal).</>}</div></Panel>
      <Panel><div className="text-sm text-ink-soft">Stocked products</div><div className="text-2xl mt-1 figure">{val.items.length}</div></Panel>
      <Panel><div className="text-sm text-ink-soft">Low on stock</div><div className={`text-2xl mt-1 figure ${low.length ? "text-brick" : ""}`}>{low.length}</div>
        {low.length > 0 && <div className="text-xs mt-1 text-ink-soft">{low.slice(0, 4).map((i) => i.name).join(", ")}{low.length > 4 ? "…" : ""}</div>}</Panel></div>}
    <div className="flex gap-3 items-center flex-wrap"><input className="field max-w-xs" placeholder="Search code or name" value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show inactive</label></div>
    <Panel>{!items ? <SkeletonRows /> : items.length === 0 ? <EmptyState icon={Package} title="No products yet" action={<Button onClick={() => setAdding(true)}>Add your first product</Button>}>Add what you sell or buy, then pick it on invoices, quotes, bills and purchase orders. Turn on stock tracking for things you keep on the shelf.</EmptyState> : shown.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing matches.</p> : (
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Code</th><th className="pb-2 font-normal">Name</th><th className="pb-2 font-normal text-right">Selling price</th><th className="pb-2 font-normal text-right">On hand</th><th className="pb-2 font-normal text-right">Average cost</th><th className="pb-2 font-normal text-right">Stock value</th></tr></thead>
        <tbody>{shown.map((i) => { const isLow = i.trackStock && i.reorderLevel !== null && Number(i.qtyOnHand) <= Number(i.reorderLevel);
          return <tr key={i.id} className={`ledger-rule hover:bg-paper ${i.isActive ? "" : "opacity-60"}`}><td className="py-2.5"><Link className="text-primary font-medium hover:underline figure" to={`/products/${i.id}`}>{i.code}</Link></td><td>{i.name}{!i.trackStock && <span className="text-xs text-ink-soft"> · service / not stocked</span>}</td>
            <td className="text-right">{i.salePrice !== null ? <Money amount={i.salePrice} /> : "—"}</td><td className={`text-right figure ${isLow ? "text-brick" : ""}`}>{i.trackStock ? `${qty(i.qtyOnHand)}${i.unit ? ` ${i.unit}` : ""}${isLow ? " · low" : ""}` : "—"}</td>
            <td className="text-right">{i.trackStock && i.averageCost !== null ? <Money amount={i.averageCost} /> : "—"}</td><td className="text-right">{i.trackStock ? <Money amount={i.stockValue} /> : "—"}</td></tr>; })}</tbody></table></div>)}</Panel></div>);
}
