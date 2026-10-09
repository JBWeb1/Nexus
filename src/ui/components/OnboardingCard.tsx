"use client";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router"; import { api } from "../api/client";
import Panel from "./Panel"; import ProgressBar from "./ProgressBar"; import Button from "./Button";
export default function OnboardingCard({ onTour }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/onboarding").then(setD).catch(() => {}); }, []);
  if (!d || d.dismissed || d.percent === 100) return null;
  const dismiss = async () => { await api.post("/onboarding/dismiss", { dismissed: true }).catch(() => {}); setD({ ...d, dismissed: true }); };
  return (<Panel title={`Setup: ${d.percent}% complete`} action={<div className="flex gap-3 items-center"><button className="text-sm text-primary font-medium hover:underline" onClick={onTour}>Take the tour</button><button className="text-sm text-ink-soft hover:underline" onClick={dismiss}>Hide</button></div>}>
    <ProgressBar percent={d.percent} label="Setup progress" />
    <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">{d.steps.map((s) => (<li key={s.key} className="flex items-start gap-2">
      <span aria-hidden className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm text-[10px] ${s.done ? "bg-primary text-primary-foreground" : "border border-hairline"}`}>{s.done ? "✓" : ""}</span>
      {s.done ? <span className="text-ink-soft line-through">{s.title}</span> : <Link className="hover:underline" to={s.link}>{s.title}<span className="block text-xs text-ink-soft no-underline">{s.hint}</span></Link>}</li>))}</ul></Panel>);
}
