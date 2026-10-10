"use client";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router"; import { Sparkles, AlertTriangle, X } from "lucide-react";
import { api } from "../api/client"; import { useAuth } from "../context/AuthContext"; import { cn } from "../lib/utils";

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

/** Tells owners and admins when a newer version is out, or when the database is behind the code (that one cannot be dismissed). */
export default function UpdateBanner() {
  const { user } = useAuth(); const [s, setS] = useState(null); const [hidden, setHidden] = useState(false);
  const manager = ["OWNER", "ADMIN"].includes(user?.role);
  useEffect(() => { if (manager) api.get("/system/update").then(setS).catch(() => {}); }, [manager]);
  if (!s) return null;
  const pending = s.database?.pending?.length > 0;
  const key = `nexus-update-dismissed-${s.latest?.version}`;
  if (!pending && (!s.updateAvailable || hidden || read(key))) return null;
  return (<div role="status" className={cn("mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-2.5 text-sm", pending ? "border-warning/30 bg-warning-soft" : "border-primary/20 bg-primary-soft")}>
    {pending ? <AlertTriangle className="size-4 shrink-0 text-warning" /> : <Sparkles className="size-4 shrink-0 text-primary" />}
    <span className="flex-1 min-w-48">{pending ? <><b>The database needs updating</b> to match this version ({s.database.pending.length} step{s.database.pending.length === 1 ? "" : "s"} waiting). Some screens may fail until it is done.</>
      : <><b>Nexus Ledger {s.latest.version} is available.</b> You are on {s.current.version}.</>}</span>
    <Link to="/setup#updates" className="rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90">{pending ? "How to fix" : "What's new"}</Link>
    {!pending && <button aria-label="Hide until the next version" className="text-muted-foreground hover:text-foreground" onClick={() => { write(key, "1"); setHidden(true); }}><X className="size-4" /></button>}</div>);
}
