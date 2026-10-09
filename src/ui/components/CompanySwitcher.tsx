"use client";
import { useEffect, useRef, useState } from "react"; import { Link } from "@/ui/lib/router"; import { AnimatePresence, motion } from "framer-motion"; import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { api } from "../api/client"; import { useAuth } from "../context/AuthContext";
export default function CompanySwitcher() {
  const { org, switchCompany } = useAuth(); const [open, setOpen] = useState(false); const [list, setList] = useState([]); const ref = useRef(null);
  useEffect(() => { if (open) api.get("/companies").then((d) => setList(d.companies)).catch(() => {}); }, [open]);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; const k = (e) => e.key === "Escape" && setOpen(false); document.addEventListener("mousedown", h); document.addEventListener("keydown", k); return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); }; }, []);
  return (<div ref={ref} className="relative"><button aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-left ring-1 ring-white/10 transition-colors hover:bg-white/10">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">{(org?.name || "?")[0].toUpperCase()}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white leading-tight">{org?.name}</span><span className="block text-xs text-sidebar-muted">Switch company</span></span><ChevronsUpDown className="size-4 text-sidebar-muted" aria-hidden /></button>
    <AnimatePresence>{open && <motion.div role="listbox" initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }} className="absolute z-40 left-0 right-0 mt-2 max-h-72 overflow-auto rounded-lg border bg-card p-1 text-foreground shadow-pop">
      {list.map((c) => <button key={c.id} role="option" aria-selected={c.active} disabled={c.active} onClick={() => switchCompany(c.id)} className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-100"><span className="truncate">{c.name}</span>{c.active && <Check className="size-4 text-primary shrink-0" />}</button>)}
      <Link to="/companies" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2 rounded-md border-t px-3 py-2 text-sm font-medium text-primary hover:bg-muted"><Plus className="size-4" />Add or manage companies</Link></motion.div>}</AnimatePresence></div>);
}
