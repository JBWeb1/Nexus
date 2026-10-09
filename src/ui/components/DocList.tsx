"use client";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router";
import { api } from "../api/client"; import { downloadFile } from "../api/download";
import Panel from "./Panel"; import Money from "./Money"; import Button from "./Button"; import StatusPill from "./StatusPill"; import ErrorNote from "./ErrorNote";
import { DOCS } from "./docConfigs";
const today = () => new Date().toISOString().slice(0, 10);
export default function DocList({ kind }) {
  const cfg = DOCS[kind]; const [rows, setRows] = useState(null); const [error, setError] = useState(null); const [filter, setFilter] = useState("ALL");
  useEffect(() => { setRows(null); api.get(cfg.path).then((d) => setRows(d[cfg.listKey])).catch((e) => setError(e.message)); }, [kind]);
  const due = (r) => r[cfg.dueField];
  const overdue = (r) => cfg.openStatuses?.includes(r.status) && due(r) < today();
  const shown = (rows || []).filter((r) => filter === "ALL" || r.status === filter);
  const statuses: string[] = ["ALL", ...new Set<string>((rows || []).map((r) => r.status))];
  return (<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3"><h1 className="font-display text-3xl">{cfg.title}</h1>
      <div className="flex gap-2">{cfg.exportPath && <Button variant="secondary" onClick={() => downloadFile(cfg.exportPath, `${kind}.xlsx`).catch((e) => setError(e.message))}>Export Excel</Button>}
        <Link to={`${cfg.route}/new`}><Button variant="gold">New {cfg.singular.toLowerCase()}</Button></Link></div></div>
    <ErrorNote error={error} />
    <div className="flex gap-2 flex-wrap">{statuses.map((s) => <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? "chip-on" : ""}`}>{s.charAt(0) + s.slice(1).toLowerCase()}</button>)}</div>
    <Panel>{!rows ? <p className="text-ink-soft text-sm">Loading…</p> : shown.length === 0 ? <p className="text-ink-soft text-sm">Nothing here yet.</p> : (
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Number</th><th className="pb-2 font-normal">{cfg.contactLabel}</th><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">{cfg.dueLabel}</th><th className="pb-2 font-normal text-right">Total</th><th className="pb-2 font-normal pl-4">Status</th></tr></thead>
        <tbody>{shown.map((r) => (<tr key={r.id} className="ledger-rule hover:bg-paper"><td className="py-2.5"><Link className="text-primary font-medium hover:underline figure" to={`${cfg.route}/${r.id}`}>{r.number}</Link></td><td>{r.contactName}</td><td className="figure text-ink-soft">{r.issueDate}</td>
          <td className={`figure ${overdue(r) ? "text-brick" : "text-ink-soft"}`}>{due(r)}{overdue(r) && " ·overdue"}</td><td className="text-right"><Money amount={r.total} currency={r.currency} /></td><td className="pl-4"><StatusPill status={r.status} /></td></tr>))}</tbody></table></div>)}</Panel></div>);
}
