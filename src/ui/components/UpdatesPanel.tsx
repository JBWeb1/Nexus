"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import { useAuth } from "../context/AuthContext";
import Panel from "./Panel"; import Button from "./Button";

/** Release notes are Markdown: show headings and bullet points as such, everything else as plain text. */
const notesLines = (md) => md.split("\n").map((l, i) => { const t = l.trim(); if (!t) return null;
  if (/^#+\s/.test(t)) return <p key={i} className="pt-2 font-semibold text-foreground">{t.replace(/^#+\s*/, "")}</p>;
  if (/^[-*]\s/.test(t)) return <p key={i} className="pl-4 -indent-3">• {t.replace(/^[-*]\s*/, "").replace(/\*\*/g, "")}</p>;
  return <p key={i}>{t.replace(/\*\*/g, "")}</p>; });
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

/** Settings > Updates: the running version, the newest release and its notes, and the database state. */
export default function UpdatesPanel() {
  const { user } = useAuth(); const [s, setS] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const load = (refresh = false) => { setBusy(true); setError(null); api.get(`/system/update${refresh ? "?refresh=1" : ""}`).then(setS).catch((e) => setError(e.message)).finally(() => setBusy(false)); };
  useEffect(() => { if (["OWNER", "ADMIN"].includes(user?.role)) load(); }, [user?.role]);
  if (!["OWNER", "ADMIN"].includes(user?.role)) return null;
  return (<div id="updates"><Panel title="Updates" action={<Button variant="secondary" disabled={busy} onClick={() => load(true)}>{busy ? "Checking…" : "Check now"}</Button>}>
    {error && <p className="text-sm text-brick">{error}</p>}
    {s && <div className="space-y-4 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><div className="label">Running</div><div className="figure text-lg">{s.current.version}</div><div className="text-xs text-ink-soft">{s.current.commit && <>build {s.current.commit.slice(0, 7)} · </>}{when(s.current.builtAt)}</div></div>
        <div><div className="label">Newest release</div>{s.latest ? <><div className="figure text-lg">{s.latest.version}</div><div className="text-xs text-ink-soft">{when(s.latest.publishedAt)}</div></> : <div className="text-xs text-ink-soft">{s.checkError || "Unknown"}</div>}</div>
        <div><div className="label">Database</div>{!s.database.known ? <div className="text-xs text-ink-soft">Could not read its version</div>
          : s.database.pending.length ? <div className="text-brick">{s.database.pending.length} update{s.database.pending.length === 1 ? "" : "s"} waiting</div> : <div className="text-success">Up to date</div>}</div></div>
      {s.updateAvailable ? <div className="rounded-lg border border-primary/20 bg-primary-soft p-3"><p><b>Version {s.latest.version} is available.</b> {s.howToUpdate}</p>
        {s.latest.notes && <div className="mt-3 max-h-64 overflow-auto space-y-1 text-ink-soft">{notesLines(s.latest.notes)}</div>}
        {s.latest.url && <a className="text-primary text-sm hover:underline" href={s.latest.url} target="_blank" rel="noreferrer">Release page →</a>}</div>
        : s.latest && <p className="text-success">You are on the newest version.</p>}
      {s.database.pending.length > 0 && <div className="rounded-lg border border-warning/30 bg-warning-soft p-3"><p><b>The database is behind this version.</b> Waiting: <span className="figure">{s.database.pending.join(", ")}</span>.</p>
        <p className="mt-1 text-ink-soft">{s.current.hosting === "vercel" ? "Set DIRECT_URL in Vercel's environment variables and redeploy: the build updates the database." : 'Run "npm run db:migrate" on the server, or "npm run update".'}</p></div>}
      {s.database.unknown.length > 0 && <p className="text-xs text-ink-soft">The database has updates this version does not know about ({s.database.unknown.join(", ")}), so a newer version ran against it before. Update the app to match.</p>}</div>}
  </Panel></div>);
}
