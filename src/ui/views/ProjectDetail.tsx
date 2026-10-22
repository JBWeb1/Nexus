"use client";
import { PageSkeleton } from "../components/ui/skeleton";
import { useEffect, useState } from "react"; import { Link, useNavigate, useParams } from "@/ui/lib/router";
import { api } from "../api/client"; import Panel from "../components/Panel"; import Button from "../components/Button"; import Money, { formatMoney } from "../components/Money"; import NotesPanel from "../components/Notes"; import StatusPill from "../components/StatusPill"; import ErrorNote from "../components/ErrorNote";
import { ProjectForm, hrs } from "./Projects"; import { toast } from "../components/Toaster";

const today = () => new Date().toISOString().slice(0, 10);
const DOC_LINK = { invoice: "/invoices", bill: "/bills", "credit note": null };

/** One project: profit so far, the hours logged (and invoicing them), and every document tagged with it. */
export default function ProjectDetail() {
  const { id } = useParams(); const nav = useNavigate(); const [d, setD] = useState(null); const [error, setError] = useState(null); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false);
  const [t, setT] = useState({ date: today(), hours: "", description: "", billable: true, rate: "" });
  const load = () => api.get(`/projects/${id}`).then(setD).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);
  const run = async (fn) => { setBusy(true); setError(null); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const addTime = (e) => { e.preventDefault(); run(async () => { await api.post(`/projects/${id}/time`, { ...t, hours: Number(t.hours), rate: t.rate === "" ? null : Number(t.rate) }); setT({ ...t, hours: "", description: "" }); toast("Time logged"); await load(); }); };
  const invoiceTime = () => { const date = window.prompt("Invoice date (YYYY-MM-DD). Billable hours up to this date are included.", today()); if (date === null) return;
    run(async () => { const r = await api.post(`/projects/${id}/invoice-time`, { issueDate: date.trim() }); toast(`Invoice ${r.invoice.number} created from ${r.entries} time entries`); nav(`/invoices/${r.invoice.id}`); }); };
  const removeTime = (entryId) => { if (!window.confirm("Delete this time entry?")) return; run(async () => { await api.delete(`/projects/${id}/time/${entryId}`); await load(); }); };
  if (!d) return (error ? <div className="text-brick">{error}</div> : <PageSkeleton />);
  const p = d.project, s = p.summary; const left = p.budget !== null ? Number(p.budget) - s.totalCosts : null;
  return (<div className="space-y-6 max-w-5xl">
    <div className="flex items-start justify-between flex-wrap gap-3"><div><Link to="/projects" className="text-sm text-ink-soft hover:underline">← Projects</Link>
      <h1 className="font-display text-3xl mt-1 flex items-center gap-3">{p.name}<StatusPill status={p.status} /></h1>
      <p className="text-sm text-ink-soft">{p.contactName || "Internal project"}{p.hourlyRate !== null && <> · <Money amount={p.hourlyRate} /> per hour</>}</p></div>
      <div className="flex gap-2 flex-wrap">{s.unbilledHours > 0 && p.contactId && <Button variant="gold" disabled={busy} onClick={invoiceTime}>Invoice {hrs(s.unbilledHours)} · {formatMoney(s.unbilledValue)}</Button>}
        <Link to="/invoices/new"><Button variant="secondary">New invoice</Button></Link><Link to="/bills/new"><Button variant="secondary">New bill</Button></Link>
        <Button variant="secondary" onClick={() => setEditing((x) => !x)}>{editing ? "Close" : "Edit"}</Button></div></div>
    <ErrorNote error={error} />
    {editing && <Panel title="Edit project"><ProjectForm initial={p} onSaved={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} /></Panel>}
    <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-4">
      <Panel><div className="text-sm text-ink-soft">Invoiced</div><div className="text-xl mt-1"><Money amount={s.netIncome} /></div>{s.credits > 0 && <div className="text-xs text-ink-soft">after <Money amount={s.credits} /> credited</div>}</Panel>
      <Panel><div className="text-sm text-ink-soft">Costs</div><div className="text-xl mt-1"><Money amount={s.totalCosts} /></div><div className="text-xs text-ink-soft">bills <Money amount={s.costs} /> · stock used <Money amount={s.stockCost} /></div></Panel>
      <Panel><div className="text-sm text-ink-soft">Profit</div><div className="text-xl mt-1"><Money amount={s.profit} tone={s.profit < 0 ? "debit" : "credit"} /></div>{s.netIncome > 0 && <div className="text-xs text-ink-soft">{Math.round((s.profit / s.netIncome) * 100)}% margin</div>}</Panel>
      <Panel><div className="text-sm text-ink-soft">{left !== null ? "Budget left" : "Hours"}</div><div className="text-xl mt-1">{left !== null ? <Money amount={left} tone={left < 0 ? "debit" : "neutral"} /> : hrs(s.hours)}</div><div className="text-xs text-ink-soft">{hrs(s.hours)} logged, {hrs(s.billableHours)} billable</div></Panel></div>
    {p.status !== "ARCHIVED" && <Panel title="Log time"><form onSubmit={addTime} className="grid grid-cols-12 gap-3 items-end">
      <div className="col-span-6 md:col-span-2"><label className="label">Date</label><input required type="date" className="field figure" value={t.date} onChange={(e) => setT({ ...t, date: e.target.value })} /></div>
      <div className="col-span-6 md:col-span-1"><label className="label">Hours</label><input required type="number" step="0.25" min="0.25" max="24" className="field figure" value={t.hours} onChange={(e) => setT({ ...t, hours: e.target.value })} /></div>
      <div className="col-span-12 md:col-span-5"><label className="label">What was done</label><input required className="field" value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} /></div>
      <div className="col-span-6 md:col-span-2"><label className="label">Rate (optional)</label><input type="number" step="0.01" min="0" className="field figure" placeholder={p.hourlyRate ?? ""} value={t.rate} onChange={(e) => setT({ ...t, rate: e.target.value })} /></div>
      <label className="col-span-6 md:col-span-1 flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={t.billable} onChange={(e) => setT({ ...t, billable: e.target.checked })} />Billable</label>
      <div className="col-span-12 md:col-span-1"><Button type="submit" disabled={busy}>Add</Button></div></form>
      {!p.contactId && <p className="text-xs text-ink-soft mt-2">Add a customer to this project (Edit) to invoice its hours.</p>}</Panel>}
    <Panel title="Time">{d.timeEntries.length === 0 ? <p className="text-sm text-ink-soft">No time logged yet.</p> : (
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">Who</th><th className="pb-2 font-normal">What</th><th className="pb-2 font-normal text-right">Hours</th><th className="pb-2 font-normal text-right">Value</th><th className="pb-2 font-normal pl-4">Invoice</th><th /></tr></thead>
        <tbody>{d.timeEntries.map((e) => <tr key={e.id} className="ledger-rule"><td className="py-2 figure text-ink-soft">{e.date}</td><td>{e.userName || "—"}</td><td>{e.description}{!e.billable && <span className="text-xs text-ink-soft"> · not billable</span>}</td>
          <td className="text-right figure">{hrs(e.hours)}</td><td className="text-right">{e.billable ? <Money amount={Number(e.hours) * Number(e.rate ?? p.hourlyRate ?? 0)} /> : "—"}</td>
          <td className="pl-4">{e.invoiceId ? <Link className="text-primary hover:underline figure" to={`/invoices/${e.invoiceId}`}>{e.invoiceNumber}</Link> : e.billable ? <span className="text-ink-soft text-xs">Not yet invoiced</span> : ""}</td>
          <td className="text-right">{!e.invoiceId && <button className="text-xs text-brick hover:underline" onClick={() => removeTime(e.id)}>Delete</button>}</td></tr>)}</tbody></table></div>)}</Panel>
    <Panel title="Invoices and bills">{d.documents.length === 0 ? <p className="text-sm text-ink-soft">Nothing yet. On an invoice or bill line, choose this project to count it here.</p> : (
      <table className="w-full text-sm"><tbody>{d.documents.map((x) => <tr key={`${x.kind}${x.id}`} className="ledger-rule"><td className="py-2 figure text-ink-soft">{x.date}</td><td className="capitalize">{x.kind}</td>
        <td>{DOC_LINK[x.kind] ? <Link className="text-primary hover:underline figure" to={`${DOC_LINK[x.kind]}/${x.id}`}>{x.number}</Link> : <span className="figure">{x.number}</span>}</td><td>{x.contactName}</td>
        <td className="text-right"><Money amount={x.amount} /></td><td className="pl-4"><StatusPill status={x.status} /></td></tr>)}</tbody></table>)}
      <p className="text-xs text-ink-soft mt-3">Amounts exclude VAT. Draft and void documents do not count towards profit.</p></Panel>
    <NotesPanel entityType="PROJECT" entityId={p.id} title="Project notes" />
  </div>);
}
