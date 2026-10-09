"use client";
import { Link } from "@/ui/lib/router"; import { Clock, Lock, AlertTriangle, Info } from "lucide-react"; import { useAuth } from "../context/AuthContext"; import { cn } from "../lib/utils";
const fmt = (iso) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
export default function PlanBanner() {
  const { org, user } = useAuth(); const s = org?.subscription; if (!s || s.status === "ACTIVE" || s.status === "COVERED") return null;
  const owner = ["OWNER", "ADMIN"].includes(user?.role);
  let tone = "info", Icon = Clock, text, cta = "See plans from R" + s.price + "/month";
  if (s.status === "TRIALING") { text = <><b>{s.daysLeft} {s.daysLeft === 1 ? "day" : "days"} left</b> in your free trial.</>; }
  else if (s.status === "EXPIRED") { tone = "danger"; Icon = Lock; text = <><b>Your free trial has ended.</b> Your books are read-only until you subscribe. Viewing and exporting still work.</>; }
  else if (s.status === "PAST_DUE") { tone = "warn"; Icon = AlertTriangle; text = <><b>Your last payment didn't go through.</b> Update your card by {fmt(s.endsAt)} to keep editing.</>; cta = "Fix payment"; }
  else if (s.status === "CANCELLED") { Icon = Info; text = <>Your subscription is cancelled. You have full access until <b>{fmt(s.endsAt)}</b>.</>; cta = "Resume"; }
  else return null;
  const tones = { info: "border-primary/20 bg-primary-soft text-foreground", warn: "border-warning/30 bg-warning-soft text-foreground", danger: "border-destructive/30 bg-destructive-soft text-foreground" };
  const icon = { info: "text-primary", warn: "text-warning", danger: "text-destructive" };
  return (<div role="status" className={cn("mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-2.5 text-sm", tones[tone])}><Icon className={cn("size-4 shrink-0", icon[tone])} /><span className="flex-1 min-w-48">{text}</span>
    {owner && <Link to="/billing" className="rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90">{cta}</Link>}</div>);
}
