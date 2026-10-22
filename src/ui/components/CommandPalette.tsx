"use client";
import { useEffect, useMemo, useRef, useState } from "react"; import { AnimatePresence, motion } from "framer-motion"; import { Search, CornerDownLeft, Plus } from "lucide-react";
import { useNavigate } from "@/ui/lib/router"; import { NAV_GROUPS } from "../layouts/nav"; import { cn } from "../lib/utils";

const ACTIONS: [string, string, string][] = [
  ["/invoices/new", "New invoice", "invoice bill customer sell"], ["/quotes/new", "New quote", "quotation estimate"], ["/bills/new", "New bill", "supplier expense purchase"],
  ["/purchase-orders/new", "New purchase order", "order supplier po"], ["/receipts", "Snap a receipt", "photo slip scan"], ["/recurring/new", "New recurring invoice", "repeat monthly"],
  ["/contacts", "Add a customer or supplier", "contact client"], ["/products", "Add a product", "stock item service"], ["/projects", "Start a project", "job timesheet hours"],
  ["/import", "Import a bank statement or spreadsheet", "csv excel upload"], ["/setup", "Install the app", "phone desktop pwa"],
];
type Item = { to: string; label: string; group: string; keywords: string; Icon?: any };

/** Ctrl+K / ⌘K: jump to any screen or start any common task by typing a few letters. */
export default function CommandPalette() {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(""); const [sel, setSel] = useState(0); const nav = useNavigate(); const input = useRef<HTMLInputElement>(null);
  const items: Item[] = useMemo(() => [
    ...ACTIONS.map(([to, label, keywords]) => ({ to, label, keywords, group: "Do", Icon: Plus })),
    ...NAV_GROUPS.flatMap((g) => g.items.map(([to, label, Icon]) => ({ to, label, Icon, keywords: g.title || "", group: "Go to" }))),
  ], []);
  const shown = useMemo(() => { const t = q.trim().toLowerCase(); if (!t) return items; const words = t.split(/\s+/);
    return items.filter((i) => words.every((w) => `${i.label} ${i.keywords}`.toLowerCase().includes(w))); }, [q, items]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } if (e.key === "Escape") setOpen(false); };
    const ext = () => setOpen(true);
    window.addEventListener("keydown", key); window.addEventListener("nexus:palette", ext); return () => { window.removeEventListener("keydown", key); window.removeEventListener("nexus:palette", ext); };
  }, []);
  useEffect(() => { if (!open) { setQ(""); setSel(0); } }, [open]);
  useEffect(() => setSel(0), [q]);
  const go = (i?: Item) => { if (!i) return; setOpen(false); nav(i.to); };
  const onKey = (e) => { if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, shown.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); } else if (e.key === "Enter") { e.preventDefault(); go(shown[sel]); } };
  return (<AnimatePresence>{open && <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
    <motion.div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
    <motion.div role="dialog" aria-label="Search Nexus" className="relative w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-pop" initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }} transition={{ type: "spring", stiffness: 500, damping: 36 }}>
      <div className="flex items-center gap-3 border-b px-4"><Search className="size-4 text-muted-foreground" /><input ref={input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search screens and actions… (e.g. new invoice, VAT)" className="h-12 flex-1 bg-transparent text-sm outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground" aria-label="Search" /></div>
      <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">{shown.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches "{q}".</li> : shown.map((i, n) => (
        <li key={`${i.group}${i.to}${i.label}`} role="option" aria-selected={n === sel}>{(n === 0 || shown[n - 1].group !== i.group) && <div className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">{i.group}</div>}
          <button onMouseEnter={() => setSel(n)} onClick={() => go(i)} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors", n === sel ? "bg-primary-soft text-primary" : "hover:bg-muted")}>
            {i.Icon && <i.Icon className="size-4 shrink-0" />}<span className="flex-1">{i.label}</span>{n === sel && <CornerDownLeft className="size-3.5 opacity-60" />}</button></li>))}</ul>
      <div className="flex items-center gap-3 border-t px-4 py-2 text-xs text-muted-foreground"><span>↑↓ to move</span><span>Enter to open</span><span>Esc to close</span></div>
    </motion.div></div>}</AnimatePresence>);
}
