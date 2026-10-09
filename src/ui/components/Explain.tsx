"use client";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router"; import { AnimatePresence, motion } from "framer-motion"; import { AlertTriangle, ArrowRight, Lightbulb } from "lucide-react";
import { api } from "../api/client"; import Money from "./Money"; import { Skeleton } from "./ui/skeleton"; import { cn } from "../lib/utils";
const TABS = [["revenue", "Revenue"], ["expenses", "Expenses"], ["debtors", "Debtors"]];
function Bars({ rows, signed = false }: { rows: { name: string; change: number; note?: string }[]; signed?: boolean }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.change)), 1);
  return (<ul className="space-y-2.5">{rows.map((r) => <li key={r.name} className="text-sm"><div className="flex items-baseline justify-between gap-3"><span className="truncate">{r.name}{r.note && <span className="ml-2 text-xs text-muted-foreground">{r.note}</span>}</span>
    <span className={cn("figure shrink-0 font-semibold", signed && (r.change > 0 ? "text-foreground" : "text-muted-foreground"))}>{signed && r.change > 0 ? "+" : ""}<Money amount={r.change} className="font-semibold" /></span></div>
    <div className="mt-1 h-1.5 rounded-full bg-muted"><motion.div className={cn("h-full rounded-full", r.change < 0 ? "bg-muted-foreground/50" : "bg-primary")} initial={{ width: 0 }} animate={{ width: `${(Math.abs(r.change) / max) * 100}%` }} transition={{ duration: 0.4 }} /></div></li>)}</ul>);
}
export default function Explain({ metric, month, onMetric }) {
  const [d, setD] = useState(null); const [error, setError] = useState(null);
  useEffect(() => { setD(null); setError(null); api.get(`/insights/explain?metric=${metric}&month=${month}`).then(setD).catch((e) => setError(e.message)); }, [metric, month]);
  return (<div className="space-y-4"><div role="tablist" className="inline-flex rounded-lg bg-muted p-1">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={metric === k} onClick={() => onMetric(k)} className={cn("rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors", metric === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>)}</div>
    {error ? <p className="text-sm text-destructive">{error}</p> : !d ? <div className="space-y-3"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-16" /><Skeleton className="h-28" /></div> :
      <AnimatePresence mode="wait"><motion.div key={metric + month} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-5">
        <h3 className="text-lg font-bold leading-snug">{d.headline}</h3>
        {d.sentences.length > 0 && <ul className="space-y-2">{d.sentences.map((s, i) => <li key={i} className="flex gap-2.5 text-sm leading-relaxed"><Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />{s}</li>)}</ul>}
        {d.anomalies.length > 0 && <div className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm"><div className="mb-1 flex items-center gap-2 font-semibold text-warning"><AlertTriangle className="size-4" />Worth a look</div>{d.anomalies.map((a) => <p key={a.name}>{a.text}</p>)}</div>}
        {d.counterparties?.length > 0 && <div><div className="mb-2 text-sm font-semibold">{d.counterpartyLabel} that moved</div><Bars rows={d.counterparties} signed /></div>}
        {metric === "debtors" && <div><div className="mb-2 text-sm font-semibold">Who owes you</div><Bars rows={d.drivers} /></div>}
        {metric !== "debtors" && d.drivers.length > 0 && <div><div className="mb-2 text-sm font-semibold">By account</div><Bars rows={d.drivers} signed /></div>}
        {d.documents.length > 0 && <div><div className="mb-2 text-sm font-semibold">Biggest {metric === "revenue" ? "invoices" : "bills"} this month</div><ul className="divide-y rounded-lg border">{d.documents.map((x) => <li key={x.id}><Link to={x.link} className="group flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60"><span className="figure font-semibold text-primary">{x.number}</span><span className="flex-1 truncate">{x.contact}</span><Money amount={x.amount} /><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Link></li>)}</ul></div>}
        {metric === "debtors" && <Link to="/invoices" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">View outstanding invoices<ArrowRight className="size-4" /></Link>}
      </motion.div></AnimatePresence>}</div>);
}
