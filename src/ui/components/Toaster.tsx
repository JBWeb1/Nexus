"use client";
import { useEffect, useState } from "react"; import { AnimatePresence, motion } from "framer-motion"; import { CheckCircle2, AlertCircle, X } from "lucide-react";

type Toast = { id: number; text: string; tone: "success" | "error" };
let next = 1;
/** Shows a short confirmation in the corner, e.g. toast("Invoice sent"). Works from anywhere in the app. */
export function toast(text: string, tone: Toast["tone"] = "success") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nexus:toast", { detail: { id: next++, text, tone } }));
}
export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const add = (e: Event) => { const t = (e as CustomEvent<Toast>).detail; setItems((x) => [...x.slice(-2), t]); setTimeout(() => setItems((x) => x.filter((y) => y.id !== t.id)), 3800); };
    window.addEventListener("nexus:toast", add); return () => window.removeEventListener("nexus:toast", add);
  }, []);
  return (<div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" role="status" aria-live="polite">
    <AnimatePresence initial={false}>{items.map((t) => (
      <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }} transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="pointer-events-auto flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-pop">
        {t.tone === "success" ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : <AlertCircle className="size-5 shrink-0 text-destructive" />}
        <span className="flex-1 font-medium">{t.text}</span>
        <button aria-label="Dismiss" onClick={() => setItems((x) => x.filter((y) => y.id !== t.id))} className="rounded p-0.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
      </motion.div>))}</AnimatePresence></div>);
}
