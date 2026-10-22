"use client";
import { SkeletonRows } from "../components/ui/skeleton";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";
const TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
export default function ChartOfAccounts() {
  const [rows, setRows] = useState(null); const [error, setError] = useState(null); const [f, setF] = useState({ code: "", name: "", type: "EXPENSE" });
  const load = () => api.get("/accounts").then((d) => setRows(d.accounts)).catch((e) => setError(e.message)); useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); setError(null); try { await api.post("/accounts", f); setF({ code: "", name: "", type: f.type }); load(); } catch (err) { setError(err.message); } };
  const toggle = async (a) => { try { await api.patch(`/accounts/${a.id}`, { isActive: !a.isActive }); load(); } catch (err) { setError(err.message); } };
  return (<div className="space-y-6"><h1 className="font-display text-3xl">Chart of accounts</h1><ErrorNote error={error} />
    <Panel title="Add account"><form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"><div><label className="label">Code</label><input required className="field figure" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
      <div className="md:col-span-2"><label className="label">Name</label><input required className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label">Type</label><select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
      <div className="md:col-span-4"><Button type="submit">Add account</Button></div></form></Panel>
    {TYPES.map((t) => <Panel key={t} title={t[0] + t.slice(1).toLowerCase()}>{!rows ? <SkeletonRows rows={4} /> : <table className="w-full text-sm"><tbody>{rows.filter((a) => a.type === t).map((a) => <tr key={a.id} className={`ledger-rule ${a.isActive ? "" : "opacity-50"}`}><td className="py-2 figure w-24">{a.code}</td><td>{a.name}</td>
      <td className="text-right">{a.isSystem ? <span className="text-xs text-ink-soft">System</span> : <button className="text-xs text-ink-soft hover:underline" onClick={() => toggle(a)}>{a.isActive ? "Deactivate" : "Reactivate"}</button>}</td></tr>)}</tbody></table>}</Panel>)}</div>);
}
