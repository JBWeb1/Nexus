"use client";
import { useEffect, useMemo, useState } from "react"; import { Link } from "@/ui/lib/router"; import { motion } from "framer-motion";
import { FileText, Receipt, FileSignature, ClipboardList, Search, ChevronRight } from "lucide-react";
import { api } from "../api/client"; import { downloadFile } from "../api/download";
import Panel from "./Panel"; import Money from "./Money"; import Button from "./Button"; import StatusPill from "./StatusPill"; import ErrorNote from "./ErrorNote"; import EmptyState from "./EmptyState"; import { SkeletonRows } from "./ui/skeleton";
import { DOCS } from "./docConfigs";
const today = () => new Date().toISOString().slice(0, 10);
const ICON = { invoices: FileText, bills: Receipt, quotes: FileSignature, "purchase-orders": ClipboardList };
const EMPTY = { invoices: "Invoices you send show here, with what is paid and what is overdue.", bills: "Supplier bills show here. Snap a receipt or add a bill to track what you owe.",
  quotes: "Send a quote, and turn it into an invoice in one click once it is accepted.", "purchase-orders": "Order stock or services from a supplier, then turn the order into a bill when their invoice arrives." };
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default function DocList({ kind }) {
  const cfg = DOCS[kind]; const Icon = ICON[kind] || FileText; const [rows, setRows] = useState(null); const [error, setError] = useState(null); const [filter, setFilter] = useState("ALL"); const [q, setQ] = useState("");
  useEffect(() => { setRows(null); api.get(cfg.path).then((d) => setRows(d[cfg.listKey])).catch((e) => setError(e.message)); }, [kind]);
  const due = (r) => r[cfg.dueField];
  const owing = (r) => cfg.openStatuses?.includes(r.status);
  const overdue = (r) => owing(r) && due(r) && due(r) < today();
  const statuses: string[] = ["ALL", ...new Set<string>((rows || []).map((r) => r.status))];
  if (cfg.openStatuses?.length && (rows || []).some(overdue)) statuses.splice(1, 0, "OVERDUE");
  const shown = (rows || []).filter((r) => (filter === "ALL" || (filter === "OVERDUE" ? overdue(r) : r.status === filter)) && (!q || `${r.number} ${r.contactName}`.toLowerCase().includes(q.toLowerCase())));
  // In rand, so foreign-currency documents add up correctly.
  const sum = useMemo(() => { const open = (rows || []).filter(owing); const zar = (r) => (Number(r.total) - Number(r.amountPaid || 0)) * Number(r.exchangeRate || 1);
    return { open: open.reduce((s, r) => s + zar(r), 0), openN: open.length, late: open.filter(overdue).reduce((s, r) => s + zar(r), 0), lateN: open.filter(overdue).length }; }, [rows]);
  const isEmpty = rows && rows.length === 0;
  return (<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3"><h1 className="font-display text-3xl">{cfg.title}</h1>
      <div className="flex gap-2">{cfg.exportPath && !isEmpty && <Button variant="secondary" onClick={() => downloadFile(cfg.exportPath, `${kind}.xlsx`).catch((e) => setError(e.message))}>Export Excel</Button>}
        <Link to={`${cfg.route}/new`}><Button variant="gold">New {cfg.singular.toLowerCase()}</Button></Link></div></div>
    <ErrorNote error={error} />
    {rows && cfg.openStatuses?.length > 0 && sum.openN > 0 && <div className="stagger grid grid-cols-2 gap-3 md:max-w-xl">
      <button onClick={() => setFilter("ALL")} className="card-hover rounded-lg border bg-card px-4 py-3 text-left shadow-card"><div className="text-xs font-medium text-muted-foreground">{kind === "bills" ? "To pay" : "Still owing"} · {sum.openN}</div><div className="mt-1 text-lg font-bold"><Money animate amount={sum.open} /></div></button>
      <button onClick={() => setFilter(sum.lateN ? "OVERDUE" : "ALL")} className={`card-hover rounded-lg border px-4 py-3 text-left shadow-card ${sum.lateN ? "border-destructive/30 bg-destructive-soft" : "bg-card"}`}><div className="text-xs font-medium text-muted-foreground">Overdue · {sum.lateN}</div><div className="mt-1 text-lg font-bold"><Money animate amount={sum.late} tone={sum.lateN ? "debit" : "neutral"} /></div></button></div>}
    {!isEmpty && <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="field pl-9" placeholder={`Search number or ${cfg.contactLabel.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
      <div className="flex gap-2 flex-wrap">{statuses.map((s) => <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? "chip-on" : ""}`}>{label(s)}</button>)}</div></div>}
    <Panel>{!rows ? <SkeletonRows /> : isEmpty ? <EmptyState icon={Icon} title={`No ${cfg.title.toLowerCase()} yet`} action={<Link to={`${cfg.route}/new`}><Button>Create your first {cfg.singular.toLowerCase()}</Button></Link>}>{EMPTY[kind]}</EmptyState>
      : shown.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing matches. <button className="text-primary hover:underline" onClick={() => { setQ(""); setFilter("ALL"); }}>Clear the search</button></p> : (<>
      {/* Phones: one tappable card per document. */}
      <ul className="-my-2 divide-y md:hidden">{shown.map((r, i) => <motion.li key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.025 }}>
        <Link to={`${cfg.route}/${r.id}`} className="flex items-center gap-3 py-3 active:bg-muted/60"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="figure font-semibold text-primary">{r.number}</span><StatusPill status={overdue(r) ? "OVERDUE" : r.status} /></div>
          <div className="truncate text-sm">{r.contactName}</div><div className={`text-xs ${overdue(r) ? "text-destructive" : "text-muted-foreground"}`}>{r.issueDate}{due(r) && ` · ${cfg.dueLabel.toLowerCase()} ${due(r)}`}</div></div>
          <div className="text-right"><Money amount={r.total} currency={r.currency} className="font-semibold" /></div><ChevronRight className="size-4 text-muted-foreground" /></Link></motion.li>)}</ul>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Number</th><th className="pb-2 font-normal">{cfg.contactLabel}</th><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">{cfg.dueLabel}</th><th className="pb-2 font-normal text-right">Total</th><th className="pb-2 font-normal pl-4">Status</th></tr></thead>
        <tbody>{shown.map((r) => (<tr key={r.id} className="ledger-rule group"><td className="py-2.5"><Link className="text-primary font-medium hover:underline figure" to={`${cfg.route}/${r.id}`}>{r.number}</Link></td><td>{r.contactName}</td><td className="figure text-ink-soft">{r.issueDate}</td>
          <td className={`figure ${overdue(r) ? "text-brick" : "text-ink-soft"}`}>{due(r) || "—"}</td><td className="text-right"><Money amount={r.total} currency={r.currency} /></td><td className="pl-4"><StatusPill status={overdue(r) ? "OVERDUE" : r.status} /></td></tr>))}</tbody></table></div></>)}</Panel></div>);
}
