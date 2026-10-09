"use client";
import { useEffect, useMemo, useState } from "react"; import { useNavigate } from "@/ui/lib/router";
import { api } from "../api/client"; import { useAuth } from "../context/AuthContext"; import Panel from "./Panel"; import Button from "./Button"; import Money from "./Money"; import ErrorNote from "./ErrorNote";
import { CURRENCIES } from "../constants/currencies"; import { DOCS } from "./docConfigs";
const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ description: "", quantity: 1, unitPrice: "", accountId: "", taxRateId: "" });
export default function DocumentForm({ kind }) {
  const cfg = DOCS[kind]; const nav = useNavigate(); const { org } = useAuth(); const terms = org?.defaultTermsDays ?? 30;
  const [ref, setRef] = useState({ contacts: [], accounts: [], taxRates: [] }); const [error, setError] = useState(null); const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ contactId: "", issueDate: today(), dueDate: "", currency: "ZAR", exchangeRate: 1, notes: "", frequency: "MONTHLY", dueDays: terms });
  const [lines, setLines] = useState([blank()]);
  useEffect(() => { Promise.all([api.get(`/contacts?type=${cfg.contactType}`), api.get("/accounts"), api.get("/tax-rates")]).then(([c, a, t]) => {
    setRef({ contacts: c.contacts, accounts: a.accounts.filter((x) => x.type === cfg.accountType && x.isActive), taxRates: t.taxRates });
    const def = t.taxRates.find((x) => x.isDefault)?.id || ""; setLines((ls) => ls.map((l) => ({ ...l, taxRateId: def })));
  }).catch((e) => setError(e.message)); }, [kind]);
  const rateOf = (id) => ref.taxRates.find((t) => t.id === id)?.rate || 0;
  const totals = useMemo(() => { let sub = 0, tax = 0; for (const l of lines) { const t = Math.round((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * 100) / 100; sub += t; tax += Math.round(t * rateOf(l.taxRateId)) / 100; } return { sub, tax, total: sub + tax }; }, [lines, ref.taxRates]);
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const body = { contactId: f.contactId, currency: f.currency, exchangeRate: Number(f.exchangeRate) || 1, notes: f.notes || undefined,
        lines: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), accountId: l.accountId, taxRateId: l.taxRateId || undefined })) };
      if (cfg.recurring) Object.assign(body, { frequency: f.frequency, startDate: f.issueDate, endDate: f.dueDate || undefined, dueDays: Number(f.dueDays) });
      else Object.assign(body, { issueDate: f.issueDate, [cfg.dueField]: f.dueDate || undefined });
      const d = await api.post(cfg.path, body); nav(cfg.recurring ? "/recurring" : `${cfg.route}/${d[cfg.itemKey].id}`);
    } catch (err) { setError(err.message); setSaving(false); }
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<form onSubmit={submit} className="space-y-6 max-w-5xl"><h1 className="font-display text-3xl">New {cfg.singular.toLowerCase()}</h1><ErrorNote error={error} />
    <Panel><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-3"><label className="label">{cfg.contactLabel}</label><select required className="field" value={f.contactId} onChange={set("contactId")}><option value="">Select…</option>{ref.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {ref.contacts.length === 0 && <p className="text-xs text-ink-soft mt-1">No {cfg.contactLabel.toLowerCase()}s yet — add one under Contacts.</p>}</div>
      {cfg.recurring && <div><label className="label">Frequency</label><select className="field" value={f.frequency} onChange={set("frequency")}>{["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"].map((x) => <option key={x}>{x}</option>)}</select></div>}
      <div><label className="label">{cfg.recurring ? "First invoice date" : "Date"}</label><input type="date" required className="field figure" value={f.issueDate} onChange={set("issueDate")} /></div>
      <div><label className="label">{cfg.dueLabel}</label><input type="date" className="field figure" value={f.dueDate} onChange={set("dueDate")} />{!cfg.recurring && cfg.dueField === "dueDate" && !f.dueDate && <p className="text-xs text-ink-soft mt-1">Left blank: due {terms} days after the date.</p>}</div>
      {cfg.recurring && <div><label className="label">Payment terms (days)</label><input type="number" min="0" className="field figure" value={f.dueDays} onChange={set("dueDays")} /></div>}
      <div><label className="label">Currency</label><select className="field" value={f.currency} onChange={set("currency")}>{CURRENCIES.map(([c, n]) => <option key={c} value={c}>{c} — {n}</option>)}</select></div>
      {f.currency !== "ZAR" && <div><label className="label">Exchange rate (1 {f.currency} = ? ZAR)</label><input type="number" step="0.0001" min="0" required className="field figure" value={f.exchangeRate} onChange={set("exchangeRate")} /></div>}
    </div></Panel>
    <Panel title="Line items"><div className="space-y-3">{lines.map((l, i) => (
      <div key={i} className="grid grid-cols-12 gap-2 items-start">
        <input required placeholder="Description" className="field col-span-12 md:col-span-4" value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} />
        <input type="number" step="0.01" min="0.01" required className="field figure col-span-3 md:col-span-1" value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} />
        <input type="number" step="0.01" min="0" required placeholder="Price" className="field figure col-span-4 md:col-span-2" value={l.unitPrice} onChange={(e) => setLine(i, "unitPrice", e.target.value)} />
        <select required className="field col-span-5 md:col-span-2" value={l.accountId} onChange={(e) => setLine(i, "accountId", e.target.value)}><option value="">Account…</option>{ref.accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select>
        <select className="field col-span-8 md:col-span-2" value={l.taxRateId} onChange={(e) => setLine(i, "taxRateId", e.target.value)}><option value="">No tax</option>{ref.taxRates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <button type="button" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))} className="col-span-4 md:col-span-1 text-brick text-sm py-2 disabled:opacity-30">Remove</button></div>))}</div>
      <Button variant="secondary" className="mt-4" onClick={() => setLines([...lines, { ...blank(), taxRateId: ref.taxRates.find((x) => x.isDefault)?.id || "" }])}>Add line</Button>
      <div className="mt-6 ml-auto max-w-xs space-y-1 text-sm"><div className="flex justify-between"><span className="text-ink-soft">Subtotal</span><Money amount={totals.sub} currency={f.currency} /></div><div className="flex justify-between"><span className="text-ink-soft">VAT</span><Money amount={totals.tax} currency={f.currency} /></div>
        <div className="flex justify-between border-t border-hairline pt-2 font-medium"><span>Total</span><Money amount={totals.total} currency={f.currency} /></div></div></Panel>
    <Panel><label className="label">Notes</label><textarea rows={3} className="field" value={f.notes} onChange={set("notes")} /></Panel>
    <div className="flex gap-3"><Button type="submit" disabled={saving}>{saving ? "Saving…" : `Save ${cfg.singular.toLowerCase()}`}</Button><Button variant="ghost" onClick={() => nav(-1)}>Cancel</Button></div></form>);
}
