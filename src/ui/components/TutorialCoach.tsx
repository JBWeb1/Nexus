"use client";
import { useEffect } from "react"; import { useLocation, useNavigate } from "@/ui/lib/router"; import { AnimatePresence, motion } from "framer-motion"; import { ArrowLeft, ArrowRight, Check, GraduationCap, MapPin, X } from "lucide-react";
import { LESSONS } from "../constants/lessons"; import { useTutorial, markDone } from "../context/TutorialContext"; import Button from "./Button";
/** A small guide that stays on screen while you do the real thing. It moves you to the right page for each step. */
export default function TutorialCoach() {
  const { active, go, stop } = useTutorial(); const nav = useNavigate(); const loc = useLocation();
  const lesson = active && LESSONS.find((l) => l.id === active.id); const i = active?.step ?? 0; const target = lesson ? (lesson.routes?.[i] || lesson.to) : null;
  useEffect(() => { if (lesson && target && i === 0 && loc.pathname !== target) nav(target); }, [active?.id]);
  if (!lesson) return null;
  const last = i === lesson.steps.length - 1; const here = loc.pathname === target || loc.pathname.startsWith(target + "/");
  const move = (n) => { go(n); const t = lesson.routes?.[n] || lesson.to; if (t && loc.pathname !== t && !(loc.pathname.startsWith(t + "/"))) nav(t); };
  const finish = () => { markDone(lesson.id); stop(); nav("/learn"); };
  return (<motion.aside role="complementary" aria-label={`Tutorial: ${lesson.title}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-xl border bg-card shadow-pop">
    <div className="flex items-center gap-2 rounded-t-xl bg-sidebar px-4 py-2.5 text-white"><GraduationCap className="size-4 text-primary" /><span className="flex-1 truncate text-sm font-semibold">{lesson.title}</span><span className="text-xs text-sidebar-muted">Step {i + 1} of {lesson.steps.length}</span><button onClick={stop} aria-label="Close tutorial" className="rounded p-1 text-sidebar-muted hover:bg-white/10 hover:text-white"><X className="size-4" /></button></div>
    <div className="p-4"><div className="mb-3 flex gap-1" aria-hidden>{lesson.steps.map((_, n) => <span key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-primary" : "bg-muted"}`} />)}</div>
      <AnimatePresence mode="wait" initial={false}><motion.p key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.14 }} className="min-h-[3.75rem] text-sm leading-relaxed">{lesson.steps[i]}</motion.p></AnimatePresence>
      {!here && <button onClick={() => nav(target)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><MapPin className="size-3.5" />Take me to the right screen</button>}
      <div className="mt-4 flex items-center justify-between"><Button variant="ghost" className="h-9 px-3" disabled={i === 0} onClick={() => move(i - 1)}><ArrowLeft />Back</Button>
        {last ? <Button className="h-9" variant="gold" onClick={finish}><Check />Finish</Button> : <Button className="h-9" onClick={() => move(i + 1)}>Next<ArrowRight /></Button>}</div></div></motion.aside>);
}
