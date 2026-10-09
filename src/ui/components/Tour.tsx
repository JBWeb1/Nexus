"use client";
import { useState } from "react"; import { useNavigate } from "@/ui/lib/router"; import { AnimatePresence, motion } from "framer-motion"; import { LayoutDashboard, FileText, Receipt, Landmark, BarChart3 } from "lucide-react"; import Button from "./Button";
const ICONS = [LayoutDashboard, FileText, Receipt, Landmark, BarChart3];
export const TOUR_STEPS = [
  { title: "This is your Dashboard", body: "Bank balance, what customers owe you, what you owe, and this month's profit — at a glance.", to: "/" },
  { title: "Here you create invoices", body: "Invoice customers in rand or SADC currencies. Sending an invoice posts it to your ledger with VAT split out automatically.", to: "/invoices" },
  { title: "Here you track expenses", body: "Capture supplier bills, or import a bank spreadsheet and map each row to an expense account.", to: "/bills" },
  { title: "Here you reconcile your bank", body: "Match bank transactions to your ledger. Ask for suggestions and match with one click.", to: "/banking" },
  { title: "Here you see reports and VAT", body: "Profit & loss, balance sheet, aged debtors — and a VAT201 you can finalize. The Work queue tells you what needs attention.", to: "/reports" },
];
export default function Tour({ onClose, onSkip }) {
  const [i, setI] = useState(0); const nav = useNavigate(); const s = TOUR_STEPS[i]; const last = i === TOUR_STEPS.length - 1; const Icon = ICONS[i];
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Product tour">
    <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.2 }} className="w-full max-w-md rounded-xl border bg-card p-6 shadow-pop">
      <div className="mb-4 flex items-center gap-1.5" aria-hidden>{TOUR_STEPS.map((_, n) => <span key={n} className={`h-1.5 rounded-full transition-all duration-300 ${n === i ? "w-6 bg-primary" : n < i ? "w-1.5 bg-primary/50" : "w-1.5 bg-border"}`} />)}<span className="ml-auto text-xs text-muted-foreground">Step {i + 1} of {TOUR_STEPS.length}</span></div>
      <AnimatePresence mode="wait" initial={false}><motion.div key={i} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.16 }}>
        <div className="mb-3 grid size-10 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="size-5" /></div>
        <h2 className="mb-2 text-xl font-bold">{s.title}</h2><p className="mb-6 min-h-[4.5rem] text-sm leading-relaxed text-muted-foreground">{s.body}</p></motion.div></AnimatePresence>
      <div className="flex items-center justify-between"><button className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-foreground" onClick={onSkip || onClose} title="Hides this tour and the setup checklist">Skip tutorial</button>
        <div className="flex gap-2">{i > 0 && <Button variant="ghost" onClick={() => setI(i - 1)}>Back</Button>}<Button variant="secondary" onClick={() => { nav(s.to); }}>Show me</Button>
          <Button onClick={() => (last ? onClose() : setI(i + 1))}>{last ? "Finish" : "Next"}</Button></div></div></motion.div></div>);
}
