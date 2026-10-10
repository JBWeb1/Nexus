"use client";
import { useEffect, useState } from "react"; import { NavLink, useLocation, useNavigate } from "@/ui/lib/router"; import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { type LucideIcon, LayoutDashboard, LineChart, ListChecks, FileText, FileSignature, Repeat, Users, Receipt, Landmark, Upload, BarChart3, Percent, CalendarCheck, BookOpen, StickyNote, History, Building2, Settings, CreditCard, GraduationCap, CheckSquare, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext"; import PlanBanner from "../components/PlanBanner"; import UpdateBanner from "../components/UpdateBanner"; import TutorialCoach from "../components/TutorialCoach"; import { TutorialProvider } from "../context/TutorialContext"; import CompanySwitcher from "../components/CompanySwitcher"; import { cn } from "../lib/utils";
export const NAV_GROUPS: { title: string | null; items: [string, string, LucideIcon][] }[] = [
  { title: null, items: [["/", "Dashboard", LayoutDashboard], ["/insights", "Insights", LineChart], ["/work-queue", "Work queue", ListChecks], ["/tasks", "Tasks", CheckSquare]] },
  { title: "Sales", items: [["/invoices", "Invoices", FileText], ["/quotes", "Quotes", FileSignature], ["/recurring", "Recurring", Repeat], ["/contacts", "Contacts", Users]] },
  { title: "Purchases", items: [["/bills", "Bills", Receipt]] },
  { title: "Money", items: [["/banking", "Banking", Landmark], ["/import", "Import", Upload]] },
  { title: "Books", items: [["/reports", "Reports", BarChart3], ["/vat201", "VAT201", Percent], ["/month-end", "Month-end", CalendarCheck], ["/accounts", "Chart of accounts", BookOpen]] },
  { title: "Workspace", items: [["/learn", "Learn", GraduationCap], ["/notes", "Notes", StickyNote], ["/activity", "Activity", History], ["/companies", "Companies", Building2], ["/billing", "Billing", CreditCard], ["/setup", "Settings", Settings]] },
];
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (<nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-4" aria-label="Main">{NAV_GROUPS.map((g, gi) => <div key={gi}>
    {g.title && <div className="px-3 pb-1.5 text-xs font-medium text-sidebar-muted/80">{g.title}</div>}
    <div className="space-y-0.5">{g.items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/"} onClick={onNavigate} className={({ isActive }) => cn("relative flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", isActive ? "text-white" : "text-sidebar-muted hover:text-white hover:bg-white/5")}>
      {({ isActive }) => <>{isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-sidebar-accent ring-1 ring-white/10" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
        {isActive && <motion.span layoutId="nav-bar" className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
        <Icon className={cn("relative size-4 shrink-0", isActive && "text-primary")} aria-hidden /><span className="relative">{label}</span></>}</NavLink>)}</div></div>)}</nav>);
}
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth(); const nav = useNavigate();
  const initials = (user?.name || "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (<>
    <div className="px-4 pt-5 pb-2"><img src="/nexus-logo.png" alt="Nexus" className="w-28 mx-auto" style={{ mixBlendMode: "screen" }} /></div>
    <div className="px-3 pb-4"><CompanySwitcher /></div>
    <NavList onNavigate={onNavigate} />
    <div className="border-t border-white/10 p-3"><div className="flex items-center gap-3 rounded-md px-2 py-1.5"><div className="grid size-8 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary-foreground ring-1 ring-primary/40">{initials}</div>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-white">{user?.name}</div><div className="truncate text-xs text-sidebar-muted">{({ OWNER: "Owner", ADMIN: "Admin", ACCOUNTANT: "Accountant", VIEWER: "Read-only" })[user?.role] || user?.role}</div></div>
      <button onClick={() => logout()} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-sidebar-muted hover:bg-white/5 hover:text-white" aria-label="Sign out"><LogOut className="size-3.5" />Sign out</button></div></div></>);
}
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const loc = useLocation(); const [open, setOpen] = useState(false); const { org, refreshOrg } = useAuth();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => { refreshOrg().catch(() => {}); const h = () => refreshOrg().catch(() => {}); window.addEventListener("nexus:paywall", h); return () => window.removeEventListener("nexus:paywall", h); }, []);
  return (<MotionConfig reducedMotion="user"><TutorialProvider><div className="min-h-screen md:flex">
    <aside className="hidden md:flex md:w-64 md:fixed md:inset-y-0 flex-col bg-sidebar text-sidebar-foreground"><SidebarBody /></aside>
    <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-sidebar px-4 py-3 text-white"><button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md p-1.5 hover:bg-white/10"><Menu className="size-5" /></button><span className="truncate text-sm font-semibold">{org?.name}</span></header>
    <AnimatePresence>{open && <><motion.div className="md:hidden fixed inset-0 z-40 bg-slate-950/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
      <motion.aside className="md:hidden fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 420, damping: 40 }}>
        <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 rounded-md p-1.5 text-sidebar-muted hover:bg-white/10"><X className="size-4" /></button><SidebarBody onNavigate={() => setOpen(false)} /></motion.aside></>}</AnimatePresence>
    <main className="md:ml-64 flex-1 min-w-0 px-4 py-6 md:px-10 md:py-9"><PlanBanner /><UpdateBanner />{/* Keyed fade-in only: an exit animation would render the next route inside the outgoing wrapper and mount every page twice. */}<motion.div key={loc.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>{children}</motion.div></main><TutorialCoach /></div></TutorialProvider></MotionConfig>);
}
