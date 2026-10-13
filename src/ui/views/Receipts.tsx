"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import { Link } from "@/ui/lib/router";
import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";

const blank = { supplierName: "", contactId: "", supplierVatNumber: "", documentNumber: "", date: "", total: "", vatAmount: "", description: "", accountId: "", taxRateId: "", bankAccountId: "" };
const R = (n) => "R " + Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Snap or upload a receipt; Claude reads it; check the fields; save it as a bill with the photo attached. */
export default function Receipts() {
  const [accounts, setAccounts] = useState([]); const [rates, setRates] = useState([]); const [banks, setBanks] = useState([]); const [suppliers, setSuppliers] = useState([]);
  const [file, setFile] = useState(null); const [preview, setPreview] = useState(null); const [read, setRead] = useState(null); const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(null); const [error, setError] = useState(null); const [saved, setSaved] = useState(null);
  useEffect(() => { Promise.all([api.get("/accounts"), api.get("/tax-rates"), api.get("/bank-accounts"), api.get("/contacts")]).then(([a, t, b, c]) => {
    setAccounts(a.accounts.filter((x) => x.type === "EXPENSE" && x.isActive)); setRates(t.taxRates); setBanks(b.bankAccounts); setSuppliers(c.contacts.filter((x) => x.type !== "CUSTOMER")); }).catch((e) => setError(e.message)); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function pick(e) {
    const chosen = e.target.files?.[0]; e.target.value = ""; if (!chosen) return;
    setFile(chosen); setPreview(chosen.type.startsWith("image/") ? URL.createObjectURL(chosen) : null); setSaved(null); setError(null); setRead(null); setF(blank); setBusy("read");
    try { const fd = new FormData(); fd.append("file", chosen); const d = await api.upload("/receipts/read", fd); setRead(d);
      const r = d.reading || {}, s = d.suggestions || {};
      setF({ ...blank, supplierName: r.supplierName || "", contactId: s.contactId || "", supplierVatNumber: r.supplierVatNumber || "", documentNumber: r.documentNumber || "", date: r.date || "",
        total: r.total ?? "", vatAmount: r.vatAmount ?? "", description: r.description || "", accountId: s.accountId || "", taxRateId: s.taxRateId || "",
        bankAccountId: r.paymentMethod === "account" ? "" : banks[0]?.id || "" });
    } catch (err) { setError(err.message); } finally { setBusy(null); }
  }
  async function save(e) {
    e.preventDefault(); setBusy("save"); setError(null);
    try { const d = await api.post("/receipts/save", { ...f, attachmentId: read?.attachmentId, total: Number(f.total), vatAmount: Number(f.vatAmount) || 0, contactId: f.contactId || null, taxRateId: f.taxRateId || null, bankAccountId: f.bankAccountId || null });
      setSaved(d.bill); setRead(null); setFile(null); setPreview(null); setF(blank); }
    catch (err) { setError(err.message); } finally { setBusy(null); }
  }
  const r = read?.reading; const rate = Number(rates.find((t) => t.id === f.taxRateId)?.rate || 0);
  const claim = rate > 0 && Number(f.vatAmount) > 0 ? Number(f.vatAmount) : rate > 0 ? Number(f.total) - Number(f.total) / (1 + rate / 100) : 0;
  return (<div className="space-y-6 max-w-5xl"><h1 className="font-display text-3xl">Receipts</h1><ErrorNote error={error} />
    {saved && <Panel><p className="text-sm text-success">Saved as bill <Link to={`/bills/${saved.id}`} className="underline figure">{saved.number}</Link> for {R(saved.total)}{saved.status === "PAID" ? ", paid" : ", still owing"}{saved.taxTotal > 0 ? `, VAT ${R(saved.taxTotal)} claimed` : ""}. The receipt is attached to it.</p></Panel>}
    <Panel title="1. Snap or upload a receipt"><p className="text-sm text-ink-soft mb-3">Take a photo of a till slip or supplier invoice, or upload a PDF. Nexus reads the supplier, date, total and VAT for you to check. Keep the photo: for VAT claims over R5,000 SARS needs a full tax invoice.</p>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">{busy === "read" ? "Reading…" : file ? "Use another receipt" : "Take photo or choose file"}
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="hidden" disabled={!!busy} onChange={pick} /></label></Panel>
    {read && <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">{preview ? <img src={preview} alt="Receipt" className="w-full rounded-lg border border-border" /> : <Panel><p className="text-sm text-ink-soft">{file?.name}</p></Panel>}</div>
      <div className="lg:col-span-3"><Panel title="2. Check and save">
        {read.readError ? <p className="text-sm text-brick mb-3">{read.readError} Fill in the details by hand.</p>
          : r && <div className="mb-3 space-y-1 text-sm">
            <p className={r.confidence === "high" ? "text-success" : "text-gold"}>{r.confidence === "high" ? "Read clearly. Check the figures, then save." : `Read with ${r.confidence} confidence: check every field.`}</p>
            {r.notes && <p className="text-ink-soft">{r.notes}</p>}
            {!r.isTaxInvoice && rates.length > 0 && <p className="text-ink-soft">This is not a full tax invoice, so no VAT is claimed unless you choose a rate.</p>}
            {read.suggestions?.duplicateOf && <p className="text-brick">Looks like bill <Link to={`/bills/${read.suggestions.duplicateOf.id}`} className="underline figure">{read.suggestions.duplicateOf.number}</Link> already has this receipt (same date and amount).</p>}
            {!read.stored && <p className="text-ink-soft">File storage is not set up, so the photo itself will not be kept.</p>}</div>}
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><label className="label">Supplier</label><div className="flex gap-2"><input className="field" required={!f.contactId} placeholder="Name on the receipt" value={f.supplierName} onChange={set("supplierName")} />
            <select className="field !w-56" value={f.contactId} onChange={set("contactId")}><option value="">{f.supplierName ? "New supplier" : "Choose…"}</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div></div>
          <div><label className="label">Date</label><input type="date" required className="field figure" value={f.date} onChange={set("date")} /></div>
          <div><label className="label">Receipt / invoice number</label><input className="field figure" value={f.documentNumber} onChange={set("documentNumber")} /></div>
          <div className="md:col-span-2"><label className="label">What was bought</label><input className="field" value={f.description} onChange={set("description")} /></div>
          <div><label className="label">Total (incl. VAT)</label><input type="number" step="0.01" min="0.01" required className="field figure" value={f.total} onChange={set("total")} /></div>
          <div><label className="label">VAT on the receipt</label><input type="number" step="0.01" min="0" className="field figure" value={f.vatAmount} onChange={set("vatAmount")} /></div>
          <div><label className="label">Expense account</label><select required className="field" value={f.accountId} onChange={set("accountId")}><option value="">Choose…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></div>
          <div><label className="label">VAT</label><select className="field" value={f.taxRateId} onChange={set("taxRateId")}><option value="">No VAT claimed</option>{rates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            {claim > 0 && <p className="text-xs text-ink-soft mt-1 figure">VAT to claim: {R(claim)}</p>}</div>
          <div className="md:col-span-2"><label className="label">Paid from</label><select className="field" value={f.bankAccountId} onChange={set("bankAccountId")}><option value="">Not paid yet (on account)</option>{banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="md:col-span-2"><Button type="submit" disabled={!!busy}>{busy === "save" ? "Saving…" : "Save as bill"}</Button></div></form></Panel></div></div>}
  </div>);
}
