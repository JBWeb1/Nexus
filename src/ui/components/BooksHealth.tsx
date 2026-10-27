"use client";
import { useEffect, useState } from "react"; import { motion } from "framer-motion"; import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, Info, RefreshCw, ChevronRight } from "lucide-react";
import { Link } from "@/ui/lib/router"; import { api } from "../api/client"; import Panel from "./Panel"; import Button from "./Button"; import { Skeleton } from "./ui/skeleton"; import { cn } from "../lib/utils";

const ICON = { ok: CheckCircle2, warning: AlertTriangle, info: Info };
const TONE = { ok: "text-success", warning: "text-warning", info: "text-muted-foreground" };
const ago = (iso) => { const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000); return s < 60 ? "just now" : `${Math.round(s / 60)} min ago`; };

/** Nexus checks its own books: each line compares the ledger with the documents behind it. `compact` is the dashboard badge. */
export default function BooksHealth({ compact = false }: { compact?: boolean }) {
  const [d, setD] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(null); const [run, setRun] = useState(0);
  const check = () => { setBusy(true); setError(null); api.get("/books-health").then((x) => { setD(x); setRun((n) => n + 1); }).catch((e) => setError(e.message)).finally(() => setBusy(false)); };
  useEffect(check, []);
  if (compact) {
    if (!d) return null;
    const Icon = d.healthy ? ShieldCheck : ShieldAlert;
    return (<Link to="/trust" className={cn("card-hover group flex items-center gap-3 rounded-lg border px-4 py-3", d.healthy ? "border-success/25 bg-success-soft" : "border-warning/30 bg-warning-soft")}>
      <motion.span initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}><Icon className={cn("size-5", d.healthy ? "text-success" : "text-warning")} /></motion.span>
      <div className="flex-1 text-sm"><span className="font-semibold">{d.healthy ? "Books check out" : "Books need a look"}</span> <span className="text-foreground/70">· {d.verified} checks passed{d.warnings ? ` · ${d.warnings} to review` : ""} · checked {ago(d.checkedAt)}</span></div>
      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Link>);
  }
  return (<Panel title={<span className="flex items-center gap-2"><ShieldCheck className="size-5 text-success" />Books health</span>} action={<Button variant="secondary" disabled={busy} onClick={check}><RefreshCw className={cn(busy && "animate-spin")} />Check again</Button>}>
    {error ? <p className="text-sm text-destructive">{error}</p> : !d ? <div className="space-y-3">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-12" />)}</div> : (<>
      <p className="mb-4 text-sm text-muted-foreground">Nexus compares your ledger with the invoices, bills and stock behind it. <span className="font-medium text-foreground">{d.verified} checks passed{d.warnings ? `, ${d.warnings} to review` : ""}</span> · checked {ago(d.checkedAt)}.</p>
      <ul className="divide-y">{d.checks.map((c, i) => { const Icon = ICON[c.status]; return (
        <motion.li key={`${run}-${c.id}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, duration: 0.25 }} className="flex gap-3 py-3">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08 + 0.15, type: "spring", stiffness: 420, damping: 16 }}><Icon className={cn("mt-0.5 size-5", TONE[c.status])} /></motion.span>
          <div><div className="text-sm font-semibold">{c.title}</div><div className="text-sm text-muted-foreground">{c.detail}</div></div></motion.li>); })}</ul></>)}
  </Panel>);
}
