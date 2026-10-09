"use client";
import TeamPanel from "../components/TeamPanel";
import SecurityPanel from "../components/SecurityPanel";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router"; import { api } from "../api/client"; import { useAuth } from "../context/AuthContext";
import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote"; import ProgressBar from "../components/ProgressBar";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export default function Setup() {
  const { refreshOrg } = useAuth(); const [meta, setMeta] = useState(null); const [f, setF] = useState(null); const [list, setList] = useState(null); const [error, setError] = useState(null); const [saved, setSaved] = useState(""); const [busy, setBusy] = useState("");
  const loadList = () => api.get("/onboarding").then(setList).catch((e) => setError(e.message));
  const load = () => api.get("/organization").then((d) => { setMeta(d); const o = d.organization; setF({ name: o.name, businessType: o.businessType || "", vatRegistered: o.vatRegistered, vatNumber: o.vatNumber || "", accountingStyle: o.accountingStyle, vatCycle: o.vatCycle, yearEndMonth: o.yearEndMonth, invoicePrefix: o.invoicePrefix, billPrefix: o.billPrefix, quotePrefix: o.quotePrefix, defaultTermsDays: o.defaultTermsDays, registrationNumber: o.registrationNumber || "", address: o.address || "", phone: o.phone || "", email: o.email || "", bankDetails: o.bankDetails || "" }); }).catch((e) => setError(e.message));
  useEffect(() => { load(); loadList(); }, []);
  async function save(section: string, body: Record<string, any>, msg?: string) { setBusy(section); setError(null); setSaved(""); try { const r = await api.patch("/organization", body); setSaved(section + (r.addedAccounts?.length ? `|${r.addedAccounts.length} accounts added` : "|" + (msg || "Saved."))); await load(); loadList(); refreshOrg(); } catch (err) { setError(err.message); } finally { setBusy(""); } }
  const Msg = ({ s }) => saved.startsWith(s + "|") ? <span className="text-sm text-success">{saved.split("|")[1]}</span> : null;
  if (!f || !meta) return <div className={error ? "text-brick" : "text-ink-soft"}>{error || "Loading…"}</div>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const chosen = meta.styles.find((s) => s.key === f.accountingStyle); const current = meta.organization.accountingStyle;
  return (<div className="space-y-6 max-w-3xl"><h1 className="font-display text-3xl">Settings</h1><ErrorNote error={error} />
    {list && !list.dismissed && list.percent < 100 && <Panel title={`Setup: ${list.percent}% complete`}><ProgressBar percent={list.percent} label="Setup progress" /><ol className="mt-4 space-y-2 text-sm">{list.steps.map((s, i) => <li key={s.key} className="flex items-center gap-3 ledger-rule pb-2">
      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-sm text-xs ${s.done ? "bg-primary text-primary-foreground" : "border border-hairline text-ink-soft"}`}>{s.done ? "✓" : i + 1}</span>
      <div className="flex-1"><div className={s.done ? "text-ink-soft" : ""}>{s.title}</div><div className="text-xs text-ink-soft">{s.hint}</div></div>{!s.done && s.key !== "profile" && <Link to={s.link}><Button variant="secondary">Go</Button></Link>}</li>)}</ol></Panel>}

    <Panel title="Business profile"><form onSubmit={(e) => { e.preventDefault(); save("profile", { name: f.name, businessType: f.businessType || undefined, vatRegistered: f.vatRegistered, vatNumber: f.vatRegistered ? f.vatNumber : undefined }); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2"><label className="label">Business name</label><input required className="field" value={f.name} onChange={set("name")} /></div>
      <div className="md:col-span-2"><label className="label">Business type</label><select required className="field" value={f.businessType} onChange={set("businessType")}><option value="">Select…</option>{meta.businessTypes.map((t) => <option key={t}>{t}</option>)}</select></div>
      <label className="md:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.vatRegistered} onChange={set("vatRegistered")} /> We are registered for VAT</label>
      {f.vatRegistered && <div className="md:col-span-2"><label className="label">VAT number (10 digits)</label><input required inputMode="numeric" className="field figure" value={f.vatNumber} onChange={set("vatNumber")} /></div>}
      <div className="md:col-span-2 flex items-center gap-3"><Button type="submit" disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save profile"}</Button><Msg s="profile" /></div></form></Panel>

    <Panel title="Accounting style"><p className="text-sm text-ink-soft mb-3">Pick the style that matches how this company earns and spends. It adds the right accounts to the chart. It never removes or renames anything you already use, so it is safe to change later.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{meta.styles.map((s) => <label key={s.key} className={`cursor-pointer rounded-lg border p-3.5 transition-colors hover:border-primary/50 ${f.accountingStyle === s.key ? "border-primary bg-primary-soft ring-1 ring-primary/30" : "border-hairline"}`}>
        <input type="radio" name="style" className="mr-2" checked={f.accountingStyle === s.key} onChange={() => setF({ ...f, accountingStyle: s.key })} /><span className="font-medium text-sm">{s.label}</span>{s.key === current && <span className="ml-2 text-xs text-success">current</span>}<p className="text-xs text-ink-soft mt-1">{s.description}</p></label>)}</div>
      {chosen && chosen.newAccounts.length > 0 && <div className="mt-3 text-sm"><div className="text-ink-soft">Will add {chosen.newAccounts.length} account{chosen.newAccounts.length > 1 ? "s" : ""}:</div><ul className="figure text-xs text-ink-soft mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-6">{chosen.newAccounts.map((a) => <li key={a}>{a}</li>)}</ul></div>}
      {chosen && chosen.newAccounts.length === 0 && f.accountingStyle !== "GENERAL" && <p className="mt-3 text-sm text-ink-soft">All accounts for this style are already in your chart.</p>}
      <div className="mt-4 flex items-center gap-3"><Button disabled={busy === "style" || (f.accountingStyle === current && (chosen?.newAccounts.length || 0) === 0)} onClick={() => save("style", { accountingStyle: f.accountingStyle })}>{busy === "style" ? "Applying…" : "Apply style"}</Button><Msg s="style" /></div></Panel>

    <Panel title="VAT and financial year"><form onSubmit={(e) => { e.preventDefault(); save("vat", { vatCycle: f.vatCycle, yearEndMonth: Number(f.yearEndMonth) }); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2"><label className="label">VAT filing cycle</label><select className="field" value={f.vatCycle} onChange={set("vatCycle")}>{meta.vatCycles.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select><p className="text-xs text-ink-soft mt-1">The VAT201 page opens on your most recent completed period.</p></div>
      <div><label className="label">Financial year ends</label><select className="field" value={f.yearEndMonth} onChange={set("yearEndMonth")}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>End of {m}</option>)}</select></div>
      <div className="md:col-span-2 flex items-center gap-3"><Button type="submit" disabled={busy === "vat"}>{busy === "vat" ? "Saving…" : "Save"}</Button><Msg s="vat" /></div></form></Panel>

    <Panel title="Numbering and payment terms"><form onSubmit={(e) => { e.preventDefault(); save("num", { invoicePrefix: f.invoicePrefix, billPrefix: f.billPrefix, quotePrefix: f.quotePrefix, defaultTermsDays: Number(f.defaultTermsDays) }); }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div><label className="label">Invoice prefix</label><input className="field figure" maxLength={8} value={f.invoicePrefix} onChange={set("invoicePrefix")} /></div>
      <div><label className="label">Bill prefix</label><input className="field figure" maxLength={8} value={f.billPrefix} onChange={set("billPrefix")} /></div>
      <div><label className="label">Quote prefix</label><input className="field figure" maxLength={8} value={f.quotePrefix} onChange={set("quotePrefix")} /></div>
      <div><label className="label">Payment terms (days)</label><input type="number" min="0" max="365" className="field figure" value={f.defaultTermsDays} onChange={set("defaultTermsDays")} /></div>
      <p className="col-span-2 md:col-span-4 text-xs text-ink-soft">New documents use these. Existing numbers never change. Example: {f.invoicePrefix || "INV"}-0001.</p>
      <div className="col-span-2 md:col-span-4 flex items-center gap-3"><Button type="submit" disabled={busy === "num"}>{busy === "num" ? "Saving…" : "Save"}</Button><Msg s="num" /></div></form></Panel>

    <Panel title="Company details for documents"><form onSubmit={(e) => { e.preventDefault(); save("details", { registrationNumber: f.registrationNumber, address: f.address, phone: f.phone, email: f.email, bankDetails: f.bankDetails }); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><label className="label">Registration number</label><input className="field figure" value={f.registrationNumber} onChange={set("registrationNumber")} /></div>
      <div><label className="label">Phone</label><input className="field" value={f.phone} onChange={set("phone")} /></div>
      <div className="md:col-span-2"><label className="label">Email</label><input type="email" className="field" value={f.email} onChange={set("email")} /></div>
      <div className="md:col-span-2"><label className="label">Address</label><textarea rows={2} className="field w-full" value={f.address} onChange={set("address")} /></div>
      <div className="md:col-span-2"><label className="label">Banking details (shown on invoices)</label><textarea rows={3} className="field w-full" placeholder="Bank, account holder, account number, branch code" value={f.bankDetails} onChange={set("bankDetails")} /></div>
      <div className="md:col-span-2 flex items-center gap-3"><Button type="submit" disabled={busy === "details"}>{busy === "details" ? "Saving…" : "Save"}</Button><Msg s="details" /></div></form></Panel>
    <TeamPanel />
    <SecurityPanel /></div>);
}
