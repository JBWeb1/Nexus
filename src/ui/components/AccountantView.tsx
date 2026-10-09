"use client";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router"; import { motion } from "framer-motion"; import { type LucideIcon, CalendarCheck, CheckSquare, Landmark, ListChecks, Search } from "lucide-react";
import { api } from "../api/client"; import { useAuth } from "../context/AuthContext"; import Panel from "./Panel"; import Button from "./Button"; import { Skeleton } from "./ui/skeleton"; import { buttonVariants } from "./ui/button"; import { cn } from "../lib/utils";
const lastMonth = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7); };
const Tile = ({ to, label, value, foot, icon: Icon, alert = false }: { to: string; label: string; value: React.ReactNode; foot: React.ReactNode; icon: LucideIcon; alert?: boolean }) => <Link to={to} className="group rounded-lg border bg-card p-5 shadow-card transition-colors hover:border-primary/50"><div className="flex items-center justify-between text-sm font-medium text-muted-foreground">{label}<Icon className={cn("size-4", alert ? "text-destructive" : "text-primary")} /></div><div className="mt-3 text-3xl font-bold leading-none">{value}</div><div className="mt-2 text-xs text-muted-foreground">{foot}</div></Link>;
export default function AccountantView({ wq }) {
  const { switchCompany } = useAuth(); const [rec, setRec] = useState(null); const [me, setMe] = useState(null); const [pr, setPr] = useState(null); const [ov, setOv] = useState(null);
  useEffect(() => { api.get("/insights/reconciliation").then(setRec).catch(() => {}); api.get(`/month-end/${lastMonth()}`).then(setMe).catch(() => {}); api.get("/practice").then(setPr).catch(() => {}); api.get("/companies/overview").then((d) => setOv(d.companies)).catch(() => {}); }, []);
  const tone = (n) => (n >= 90 ? "bg-success" : n >= 60 ? "bg-warning" : "bg-destructive");
  return (<div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile to="/work-queue" label="Needs your attention" icon={ListChecks} alert={wq?.urgent > 0} value={wq ? wq.total : "…"} foot={wq ? `${wq.urgent} urgent, ${wq.review} to review` : ""} />
      <Tile to="/banking" label="Bank lines to match" icon={Landmark} alert={rec?.unmatched > 0} value={rec ? rec.unmatched : "…"} foot={rec ? `${rec.matchedPct}% of ${rec.total} reconciled` : ""} />
      <Tile to="/month-end" label={me ? `${me.label} close` : "Month-end close"} icon={CalendarCheck} value={me ? `${me.progress}%` : "…"} foot={me ? (me.closed ? "Closed" : `${me.blockingIssues} thing${me.blockingIssues === 1 ? "" : "s"} blocking the close`) : ""} />
      <Tile to="/tasks" label="Open tasks" icon={CheckSquare} alert={pr?.totals.overdue > 0} value={pr ? pr.totals.open : "…"} foot={pr ? `${pr.totals.overdue} overdue, ${pr.totals.dueThisWeek} due this week` : ""} /></div>
    <Panel title="Client readiness" action={<Link to="/work-queue" className={buttonVariants({ variant: "outline", size: "sm" })}><Search />Find problems</Link>}>
      {!ov ? <Skeleton className="h-24" /> : <><p className="mb-4 text-xs text-muted-foreground">Share of last month's close checks that pass: bank reconciled, no drafts, trial balance, VAT, duplicates and overdue debtors.</p>
        <ul className="space-y-4">{[...ov].sort((a, b) => a.readiness - b.readiness).map((c) => <li key={c.id} className="flex items-center gap-4"><div className="w-44 shrink-0 truncate text-sm font-medium">{c.name}</div>
          <div className="h-2.5 flex-1 rounded-full bg-muted"><motion.div className={cn("h-full rounded-full", tone(c.readiness))} initial={{ width: 0 }} animate={{ width: `${c.readiness}%` }} transition={{ duration: 0.5 }} /></div><span className="figure w-11 text-right text-sm font-semibold">{c.readiness}%</span>
          {c.active ? <span className="w-24 text-right text-xs text-muted-foreground">Open now</span> : <Button variant="secondary" className="h-8 w-24 px-0 text-xs" onClick={() => switchCompany(c.id)}>Open books</Button>}</li>)}</ul></>}</Panel></div>);
}
