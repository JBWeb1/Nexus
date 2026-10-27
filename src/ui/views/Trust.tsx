"use client";
import { motion } from "framer-motion"; import { Building2, KeyRound, Smartphone, LogOut, Gauge, Users, Lock, CalendarX2, History, Download, DatabaseBackup, FlaskConical } from "lucide-react";
import { Link } from "@/ui/lib/router"; import { useAuth } from "../context/AuthContext"; import BooksHealth from "../components/BooksHealth"; import SecurityPanel from "../components/SecurityPanel";

// Each line is something the code actually does, so it can be checked.
const FACTS = [
  [Building2, "Your company's data is walled off", "Every company's records are separated inside the database itself (row-level security), not only by the app."],
  [KeyRound, "Passwords are never stored", "Only a one-way bcrypt hash is kept, so nobody can read your password, including us."],
  [Smartphone, "Two-step sign-in", "Add a 6-digit code from an authenticator app to every sign-in."],
  [LogOut, "A password reset signs everyone out", "Resetting your password ends every session that was signed in before it."],
  [Gauge, "Repeated sign-in attempts are slowed down", "Guessing passwords is limited per minute and per hour."],
  [Users, "People only see what their role allows", "Owner, Admin, Accountant or Read-only, per company."],
  [Lock, "Posted entries cannot be edited", "The database refuses changes to posted entries. Corrections are reversals, so the history stays visible."],
  [CalendarX2, "Closed periods stay closed", "Once you lock a period, nothing can be posted into it."],
  [History, "A record of every change", "The activity log shows who did what, and when."],
  [Download, "Your data is yours", "Download everything in one click, any time: Excel exports and the full company file (also your POPIA request)."],
  [DatabaseBackup, "Updates back up first", "On your own server, every update backs up the database before it changes anything, and rolls back if it fails."],
  [FlaskConical, "Tested on every change", "Every change to Nexus must pass more than 360 automated checks, including a full quarter of real bookkeeping."],
] as const;

export default function Trust() {
  const { user } = useAuth();
  return (<div className="max-w-5xl space-y-6">
    <div><h1 className="text-3xl">Trust &amp; security</h1><p className="mt-1 text-sm text-muted-foreground">How Nexus keeps your books right and your data safe. Everything here is checked live or built into the software.</p></div>
    <BooksHealth />
    <div><h2 className="mb-3 text-lg">How your data is protected</h2>
      <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2">{FACTS.map(([Icon, title, text]) => (
        <div key={title} className="flex gap-3 rounded-lg border bg-card p-4 shadow-card">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon className="size-4" /></span>
          <div><div className="text-sm font-semibold">{title}</div><div className="text-sm text-muted-foreground">{text}</div></div></div>))}</div></div>
    <SecurityPanel />
    {["OWNER", "ADMIN", "ACCOUNTANT"].includes(user?.role) && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">See every change under <Link to="/activity" className="font-medium text-primary hover:underline">Activity</Link>, and lock closed months under <Link to="/month-end" className="font-medium text-primary hover:underline">Month-end</Link>.</motion.p>}
  </div>);
}
