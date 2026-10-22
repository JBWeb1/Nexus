"use client";
import { useEffect, useState } from "react"; import { Link, useNavigate } from "@/ui/lib/router";
import { api } from "../api/client"; import Panel from "../components/Panel"; import Button from "../components/Button"; import Money from "../components/Money"; import StatusPill from "../components/StatusPill"; import ErrorNote from "../components/ErrorNote"; import { toast } from "../components/Toaster"; import EmptyState from "../components/EmptyState"; import { SkeletonRows } from "../components/ui/skeleton"; import { FolderKanban } from "lucide-react";

export const hrs = (n) => `${Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 2 })} h`;

/** Add or edit a project: its customer, hourly rate and budget. */
export function ProjectForm({ initial = null, onSaved, onCancel = null }) {
  const [f, setF] = useState({ name: "", contactId: "", hourlyRate: "", budget: "", status: "ACTIVE", notes: "", ...(initial || {}) }); const [customers, setCustomers] = useState([]); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/contacts").then((d) => setCustomers(d.contacts.filter((c) => c.type !== "SUPPLIER"))).catch((e) => setError(e.message)); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(null);
    const body = { name: f.name, contactId: f.contactId || null, hourlyRate: f.hourlyRate === "" || f.hourlyRate === null ? null : Number(f.hourlyRate), budget: f.budget === "" || f.budget === null ? null : Number(f.budget), status: f.status, notes: f.notes || null };
    try { const d = initial ? await api.patch(`/projects/${initial.id}`, body) : await api.post("/projects", body); toast(initial ? "Project saved" : `${d.project.name} added`); onSaved(d.project); } catch (err) { setError(err.message); setBusy(false); }
  }
  return (<form onSubmit={submit} className="space-y-4"><ErrorNote error={error} />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-2"><label className="label">Project name</label><input required className="field" placeholder="e.g. Shopfitting for Karoo Coffee" value={f.name} onChange={set("name")} /></div>
      <div className="md:col-span-2"><label className="label">Customer</label><select className="field" value={f.contactId || ""} onChange={set("contactId")}><option value="">No customer (internal project)</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label className="label">Hourly rate (excl. VAT)</label><input type="number" step="0.01" min="0" className="field figure" value={f.hourlyRate ?? ""} onChange={set("hourlyRate")} /></div>
      <div><label className="label">Budget (optional)</label><input type="number" step="0.01" min="0" className="field figure" value={f.budget ?? ""} onChange={set("budget")} /></div>
      {initial && <div><label className="label">Status</label><select className="field" value={f.status} onChange={set("status")}><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option></select></div>}
      <div className="md:col-span-4"><label className="label">Notes (optional)</label><input className="field" value={f.notes || ""} onChange={set("notes")} /></div>
    </div>
    <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Add project"}</Button>{onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}</div></form>);
}

export default function Projects() {
  const nav = useNavigate(); const [rows, setRows] = useState(null); const [error, setError] = useState(null); const [adding, setAdding] = useState(false); const [status, setStatus] = useState("ACTIVE");
  useEffect(() => { setRows(null); api.get(`/projects${status === "ALL" ? "" : `?status=${status}`}`).then((d) => setRows(d.projects)).catch((e) => setError(e.message)); }, [status]);
  const tot = (rows || []).reduce((s, p) => ({ income: s.income + p.summary.netIncome, profit: s.profit + p.summary.profit, unbilled: s.unbilled + p.summary.unbilledValue }), { income: 0, profit: 0, unbilled: 0 });
  return (<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3"><h1 className="font-display text-3xl">Projects</h1><Button variant="gold" onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "New project"}</Button></div>
    <ErrorNote error={error} />
    <p className="text-sm text-ink-soft max-w-3xl">Tag invoice and bill lines with a project to see what each job really made, log the hours your team spends on it, and invoice billable hours in one click.</p>
    {adding && <Panel title="New project"><ProjectForm onSaved={(p) => nav(`/projects/${p.id}`)} onCancel={() => setAdding(false)} /></Panel>}
    <div className="flex gap-2 flex-wrap">{["ACTIVE", "COMPLETED", "ARCHIVED", "ALL"].map((s) => <button key={s} onClick={() => setStatus(s)} className={`chip ${status === s ? "chip-on" : ""}`}>{s.charAt(0) + s.slice(1).toLowerCase()}</button>)}</div>
    {rows && rows.length > 0 && <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-4">
      <Panel><div className="text-sm text-ink-soft">Invoiced</div><div className="text-2xl mt-1"><Money animate amount={tot.income} /></div></Panel>
      <Panel><div className="text-sm text-ink-soft">Profit</div><div className="text-2xl mt-1"><Money animate amount={tot.profit} tone={tot.profit < 0 ? "debit" : "neutral"} /></div></Panel>
      <Panel><div className="text-sm text-ink-soft">Hours not yet invoiced</div><div className="text-2xl mt-1"><Money animate amount={tot.unbilled} /></div></Panel></div>}
    <Panel>{!rows ? <SkeletonRows /> : rows.length === 0 ? <EmptyState icon={FolderKanban} title={status === "ACTIVE" ? "No active projects" : "No projects here"} action={status === "ACTIVE" ? <Button onClick={() => setAdding(true)}>Start a project</Button> : null}>A project collects the invoices, bills and hours for one job, so you can see whether it made money.</EmptyState> : (
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Project</th><th className="pb-2 font-normal">Customer</th><th className="pb-2 font-normal text-right">Invoiced</th><th className="pb-2 font-normal text-right">Costs</th><th className="pb-2 font-normal text-right">Profit</th><th className="pb-2 font-normal text-right">Hours</th><th className="pb-2 font-normal text-right">Not invoiced</th><th className="pb-2 font-normal pl-4">Status</th></tr></thead>
        <tbody>{rows.map((p) => { const s = p.summary; const over = p.budget !== null && s.totalCosts > Number(p.budget);
          return <tr key={p.id} className="ledger-rule hover:bg-paper"><td className="py-2.5"><Link className="text-primary font-medium hover:underline" to={`/projects/${p.id}`}>{p.name}</Link></td><td>{p.contactName || <span className="text-ink-soft">Internal</span>}</td>
            <td className="text-right"><Money amount={s.netIncome} /></td><td className={`text-right ${over ? "text-brick" : ""}`}><Money amount={s.totalCosts} />{over && <div className="text-xs">over budget</div>}</td>
            <td className="text-right"><Money amount={s.profit} tone={s.profit < 0 ? "debit" : "neutral"} /></td><td className="text-right figure">{hrs(s.hours)}</td><td className="text-right">{s.unbilledHours > 0 ? <><Money amount={s.unbilledValue} /><div className="text-xs text-ink-soft">{hrs(s.unbilledHours)}</div></> : "—"}</td>
            <td className="pl-4"><StatusPill status={p.status} /></td></tr>; })}</tbody></table></div>)}</Panel></div>);
}
