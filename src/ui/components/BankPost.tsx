"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import Button from "./Button";
export function PostRow({ bankId, txn, accounts, taxRates, onDone, onError }) {
  const out = txn.type === "DEBIT"; const opts = accounts.filter((a) => a.isActive !== false && (out ? ["EXPENSE", "ASSET", "LIABILITY", "EQUITY"] : ["REVENUE", "LIABILITY", "EQUITY", "ASSET"]).includes(a.type));
  const [accountId, setAccountId] = useState(""); const [taxRateId, setTaxRateId] = useState(""); const [busy, setBusy] = useState(false);
  async function go(e) { e.preventDefault(); setBusy(true); onError(null); try { await api.post(`/bank-accounts/${bankId}/transactions/${txn.id}/categorise`, { accountId, taxRateId: taxRateId || undefined }); onDone(); } catch (err) { onError(err.message); setBusy(false); } }
  return (<form onSubmit={go} className="flex flex-wrap items-end gap-3 pl-2 pb-3">
    <div><label className="label">{out ? "Spent on" : "Income from"}</label><select required className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Choose account…</option>{opts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></div>
    <div><label className="label">VAT</label><select className="field" value={taxRateId} onChange={(e) => setTaxRateId(e.target.value)}><option value="">No VAT</option>{taxRates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
    <Button type="submit" disabled={busy || !accountId}>{busy ? "Posting…" : "Post to ledger"}</Button></form>);
}
export function RulesPanel({ bankId, accounts, taxRates, onApplied }) {
  const [rules, setRules] = useState(null); const [open, setOpen] = useState(false); const [error, setError] = useState(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", matchText: "", direction: "DEBIT", accountId: "", taxRateId: "" });
  const load = () => api.get("/bank-rules").then((d) => setRules(d.rules)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const opts = accounts.filter((a) => (f.direction === "DEBIT" ? ["EXPENSE", "ASSET", "LIABILITY", "EQUITY"] : ["REVENUE", "LIABILITY", "EQUITY", "ASSET"]).includes(a.type));
  async function add(e) { e.preventDefault(); setBusy(true); setError(null); try { await api.post("/bank-rules", { ...f, taxRateId: f.taxRateId || undefined, name: f.name || undefined }); setF({ name: "", matchText: "", direction: "DEBIT", accountId: "", taxRateId: "" }); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function del(id) { try { await api.delete(`/bank-rules/${id}`); load(); } catch (e) { setError(e.message); } }
  async function apply() { setBusy(true); setError(null); setMsg(""); try { const d = await api.post(`/bank-accounts/${bankId}/apply-rules`); setMsg(`${d.applied} posted, ${d.remaining} still need you.`); onApplied(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return (<div className="mt-6 pt-5 ledger-rule"><div className="flex items-center justify-between flex-wrap gap-2"><h3 className="font-display text-lg">Bank rules</h3>
    <div className="flex items-center gap-3">{msg && <span className="text-xs text-ink-soft">{msg}</span>}<Button variant="secondary" disabled={busy || !rules?.length} onClick={apply}>Apply rules</Button><Button variant="secondary" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Add rule"}</Button></div></div>
    <p className="text-sm text-ink-soft mt-1">A rule posts matching bank lines for you, for example "WOOLWORTHS" always goes to Groceries.</p>
    {error && <p className="text-sm text-brick mt-2">{error}</p>}
    {open && <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end mt-3">
      <div><label className="label">Description contains</label><input required className="field" value={f.matchText} onChange={(e) => setF({ ...f, matchText: e.target.value })} /></div>
      <div><label className="label">Money</label><select className="field" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value, accountId: "" })}><option value="DEBIT">Out</option><option value="CREDIT">In</option></select></div>
      <div><label className="label">Post to</label><select required className="field" value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}><option value="">Choose…</option>{opts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></div>
      <div><label className="label">VAT</label><select className="field" value={f.taxRateId} onChange={(e) => setF({ ...f, taxRateId: e.target.value })}><option value="">No VAT</option>{taxRates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <Button type="submit" disabled={busy}>Save rule</Button></form>}
    {rules && rules.length > 0 && <table className="w-full text-sm mt-3"><tbody>{rules.map((r) => <tr key={r.id} className="ledger-rule"><td className="py-2">“{r.matchText}”</td><td className="text-ink-soft">{r.direction === "DEBIT" ? "money out" : "money in"}</td><td>{r.accountCode} {r.accountName}</td><td className="text-ink-soft">{r.taxName || "No VAT"}</td><td className="text-right"><button className="text-xs text-brick hover:underline" onClick={() => del(r.id)}>Delete</button></td></tr>)}</tbody></table>}</div>);
}
