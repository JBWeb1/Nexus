"use client";
import { useMemo, useState } from "react"; import { useNavigate } from "@/ui/lib/router"; import { AnimatePresence, motion } from "framer-motion"; import { ArrowRight, Check, ChevronDown, Clock, PlayCircle, Search } from "lucide-react";
import { LESSONS } from "../constants/lessons"; import Button from "../components/Button"; import ProgressBar from "../components/ProgressBar"; import { cn } from "../lib/utils"; import { useTutorial } from "../context/TutorialContext";
const KEY = "nexus_lessons_done";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
export default function Learn() {
  const nav = useNavigate(); const tut = useTutorial(); const [q, setQ] = useState(""); const [open, setOpen] = useState(null); const [done, setDone] = useState(read);
  const toggle = (id) => setDone((d) => { const n = d.includes(id) ? d.filter((x) => x !== id) : [...d, id]; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {} return n; });
  const shown = useMemo(() => { const t = q.trim().toLowerCase(); return LESSONS.filter((l) => !t || [l.title, l.summary, ...l.steps].join(" ").toLowerCase().includes(t)); }, [q]);
  const groups = [...new Set(shown.map((l) => l.group))]; const pct = Math.round((done.filter((id) => LESSONS.some((l) => l.id === id)).length / LESSONS.length) * 100);
  const tour = () => { try { localStorage.setItem("nexus_tour_pending", "1"); } catch {} nav("/"); };
  return (<div className="max-w-3xl space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl">Learn how to use Nexus</h1><p className="mt-1 text-sm text-muted-foreground">Guided tutorials built into the app. Start one and a small guide stays with you, step by step, on the real screens.</p></div>
      <Button variant="secondary" onClick={tour}><PlayCircle />Replay the product tour</Button></div>
    <div className="rounded-lg border bg-card p-4 shadow-card"><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">Your progress</span><span className="text-muted-foreground">{done.length} of {LESSONS.length} lessons done</span></div><ProgressBar percent={pct} label="Lessons completed" /></div>
    <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input type="search" aria-label="Search lessons" placeholder="Search, for example VAT or credit note" className="field pl-9" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {shown.length === 0 && <p className="text-sm text-muted-foreground">No lesson matches "{q}". Try a shorter word.</p>}
    {groups.map((g) => <section key={g}><h2 className="mb-2 text-sm font-semibold text-muted-foreground">{g}</h2><div className="overflow-hidden rounded-lg border bg-card shadow-card divide-y">{shown.filter((l) => l.group === g).map((l) => { const isOpen = open === l.id, isDone = done.includes(l.id); return (<div key={l.id}>
      <button onClick={() => setOpen(isOpen ? null : l.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50">
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs", isDone ? "border-success bg-success text-primary-foreground" : "border-input text-transparent")}><Check className="size-3.5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{l.title}</span><span className="block truncate text-xs text-muted-foreground">{l.summary}</span></span>
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Clock className="size-3.5" />{l.minutes} min</span><ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} /></button>
      <AnimatePresence initial={false}>{isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"><div className="px-4 pb-4 pl-[3.25rem]">
        <ol className="space-y-2.5">{l.steps.map((s, i) => <li key={i} className="flex gap-3 text-sm leading-relaxed"><span className="figure grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">{i + 1}</span>{s}</li>)}</ol>
        <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => tut.start(l.id)}><PlayCircle />Start guided tutorial</Button><Button variant="secondary" onClick={() => nav(l.to)}>Take me there<ArrowRight /></Button><Button variant="secondary" onClick={() => toggle(l.id)}>{isDone ? "Mark as not done" : "Mark as done"}</Button></div></div></motion.div>}</AnimatePresence></div>); })}</div></section>)}</div>);
}
