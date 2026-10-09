"use client";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router"; import { api } from "../api/client";
import Panel from "../components/Panel"; import Button from "../components/Button"; import StatusPill from "../components/StatusPill"; import ErrorNote from "../components/ErrorNote";
export default function RecurringList() {
  const [rows, setRows] = useState(null); const [error, setError] = useState(null); const [msg, setMsg] = useState(null);
  const load = () => api.get("/recurring-invoices").then((d) => setRows(d.recurringInvoices)).catch((e) => setError(e.message)); useEffect(() => { load(); }, []);
  const run = async () => { setError(null); try { const d = await api.post("/recurring-invoices/run-due"); setMsg(d.count ? `Generated ${d.count} draft invoice${d.count > 1 ? "s" : ""}. Review them under Invoices.` : "Nothing is due right now."); load(); } catch (e) { setError(e.message); } };
  const toggle = async (r) => { try { await api.post(`/recurring-invoices/${r.id}/${r.status === "ACTIVE" ? "pause" : "resume"}`); load(); } catch (e) { setError(e.message); } };
  return (<div className="space-y-6"><div className="flex items-center justify-between flex-wrap gap-3"><h1 className="font-display text-3xl">Recurring invoices</h1><div className="flex gap-2"><Button variant="secondary" onClick={run}>Generate due invoices</Button><Link to="/recurring/new"><Button variant="gold">New template</Button></Link></div></div>
    <ErrorNote error={error} />{msg && <div className="text-sm text-success bg-primary/10 border border-ledger/30 rounded-sm px-3 py-2">{msg}</div>}
    <Panel>{!rows ? "Loading…" : rows.length === 0 ? <p className="text-sm text-ink-soft">No recurring templates yet. Invoices are generated as drafts when you press “Generate due invoices”.</p> : <table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Customer</th><th className="pb-2 font-normal">Frequency</th><th className="pb-2 font-normal">Next run</th><th className="pb-2 font-normal">Status</th><th /></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className="ledger-rule"><td className="py-2.5">{r.contactName}</td><td>{r.frequency}</td><td className="figure">{r.nextRunDate}</td><td><StatusPill status={r.status} /></td><td className="text-right">{r.status !== "ENDED" && <button className="text-xs text-ink-soft hover:underline" onClick={() => toggle(r)}>{r.status === "ACTIVE" ? "Pause" : "Resume"}</button>}</td></tr>)}</tbody></table>}</Panel></div>);
}
