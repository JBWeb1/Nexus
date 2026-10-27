import { type LucideIcon, Camera, LayoutDashboard, LineChart, ListChecks, FileText, FileSignature, Repeat, Users, Receipt, Landmark, Upload, BarChart3, Percent, CalendarCheck, BookOpen, StickyNote, History, Building2, Settings, CreditCard, GraduationCap, CheckSquare, Package, ClipboardList, FolderKanban, ShieldCheck } from "lucide-react";
/** The main menu. The search (Ctrl+K) offers the same screens. */
export const NAV_GROUPS: { title: string | null; items: [string, string, LucideIcon][] }[] = [
  { title: null, items: [["/", "Dashboard", LayoutDashboard], ["/insights", "Insights", LineChart], ["/work-queue", "Work queue", ListChecks], ["/tasks", "Tasks", CheckSquare]] },
  { title: "Sales", items: [["/invoices", "Invoices", FileText], ["/quotes", "Quotes", FileSignature], ["/recurring", "Recurring", Repeat], ["/contacts", "Contacts", Users]] },
  { title: "Purchases", items: [["/bills", "Bills", Receipt], ["/purchase-orders", "Purchase orders", ClipboardList], ["/receipts", "Receipts", Camera]] },
  { title: "Operations", items: [["/products", "Products & stock", Package], ["/projects", "Projects", FolderKanban]] },
  { title: "Money", items: [["/banking", "Banking", Landmark], ["/import", "Import", Upload]] },
  { title: "Books", items: [["/reports", "Reports", BarChart3], ["/vat201", "VAT201", Percent], ["/month-end", "Month-end", CalendarCheck], ["/accounts", "Chart of accounts", BookOpen]] },
  { title: "Workspace", items: [["/learn", "Learn", GraduationCap], ["/notes", "Notes", StickyNote], ["/trust", "Trust & security", ShieldCheck], ["/activity", "Activity", History], ["/companies", "Companies", Building2], ["/billing", "Billing", CreditCard], ["/setup", "Settings", Settings]] },
];
