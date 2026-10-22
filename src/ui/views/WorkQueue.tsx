"use client";
import { PageSkeleton } from "../components/ui/skeleton";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router"; import { api } from "../api/client";
import Panel from "../components/Panel"; import ErrorNote from "../components/ErrorNote";
const SEV = { urgent: ["Urgent", "bg-destructive-soft text-destructive"], review: ["Needs review", "bg-warning-soft text-warning"], info: ["For your information", "bg-muted text-muted-foreground"] };
export default function WorkQueue() {
  const [d, setD] = useState(null); const [error, setError] = useState(null); const [open, setOpen] = useState({});
  useEffect(() => { api.get("/work-queue").then(setD).catch((e) => setError(e.message)); }, []);
  if (!d) return (error ? <div className="text-brick">{error}</div> : <PageSkeleton />);
  return (<div className="space-y-6 max-w-4xl"><div><h1 className="font-display text-3xl">Work queue</h1><p className="text-sm text-ink-soft mt-1">The books decide what needs a human. Every flag shows the evidence behind it — these are rule-based checks, not guesses.</p></div><ErrorNote error={error} />
    <div className="grid grid-cols-3 gap-4">{["urgent", "review", "info"].map((s) => <div key={s} className="bg-paper-light border border-hairline rounded-sm p-4"><div className="text-sm text-ink-soft">{SEV[s][0]}</div><div className="text-3xl font-display">{d.summary[s]}</div></div>)}</div>
    {d.items.length === 0 ? <Panel><p className="text-sm text-success">Nothing needs your attention. Your books are clean.</p></Panel> :
      <div className="space-y-3">{d.items.map((it) => (<div key={it.id} className="bg-paper-light border border-hairline rounded-sm p-4">
        <div className="flex items-start gap-3"><span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${SEV[it.severity][1]}`}>{SEV[it.severity][0]}</span>
          <div className="flex-1 min-w-0"><div className="font-medium">{it.title}</div><div className="text-sm text-ink-soft">{it.detail}</div>
            {it.evidence.length > 0 && <><button className="text-xs text-primary font-medium hover:underline mt-1" aria-expanded={!!open[it.id]} onClick={() => setOpen({ ...open, [it.id]: !open[it.id] })}>{open[it.id] ? "Hide" : "Why was this flagged?"}</button>
              {open[it.id] && <ul className="mt-2 text-sm space-y-1 bg-paper rounded-sm p-3">{it.evidence.map((e, i) => <li key={i} className="figure text-xs">{e}</li>)}</ul>}</>}</div>
          <Link to={it.link} className="text-sm text-primary font-medium hover:underline whitespace-nowrap">Review →</Link></div></div>))}</div>}</div>);
}
