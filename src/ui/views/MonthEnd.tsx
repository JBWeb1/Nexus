"use client";
import NotesPanel from "../components/Notes";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router"; import { api } from "../api/client";
import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote"; import ProgressBar from "../components/ProgressBar";
const prevMonth = () => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); };
const ICON = { ok: ["✓", "bg-success text-primary-foreground"], issue: ["!", "bg-destructive text-primary-foreground"], warn: ["!", "bg-warning text-primary-foreground"] };
export default function MonthEnd() {
  const [period, setPeriod] = useState(prevMonth()); const [d, setD] = useState(null); const [closes, setCloses] = useState([]); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => { setError(null); api.get(`/month-end/${period}`).then(setD).catch((e) => { setD(null); setError(e.message); }); api.get("/month-end").then((x) => setCloses(x.closes)).catch(() => {}); };
  useEffect(load, [period]);
  async function close() {
    if (!window.confirm(`Close ${d.label}? This locks the month: nothing can be posted into it afterwards.`)) return;
    setBusy(true); setError(null); try { await api.post(`/month-end/${period}/close`); load(); } catch (e) { setError(e.message + (e.details ? ": " + e.details.join("; ") : "")); } finally { setBusy(false); }
  }
  return (<div className="space-y-6 max-w-3xl"><h1 className="font-display text-3xl">Month-end close</h1><ErrorNote error={error} />
    <div><label className="label">Month</label><input type="month" className="field figure !w-auto" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} /></div>
    {d && <Panel title={`${d.label} — ${d.progress}% ready`} action={d.closed ? <span className="text-sm text-success">Closed</span> : <Button variant="gold" disabled={busy || !d.canClose} onClick={close}>{busy ? "Closing…" : "Close month"}</Button>}>
      <ProgressBar percent={d.progress} label="Month-end progress" />
      {d.closed && <p className="mt-4 text-sm bg-primary/10 border border-ledger/30 rounded-sm px-3 py-2">{d.label} — Closed by {d.closed.closedByName} — {new Date(d.closed.closedAt).toLocaleDateString("en-ZA")}. The period is locked.</p>}
      {!d.monthEnded && !d.closed && <p className="mt-4 text-sm text-ink-soft">This month hasn't ended yet, so it can't be closed.</p>}
      <ul className="mt-5 space-y-4">{d.checks.map((c) => (<li key={c.key} className="flex gap-3"><span aria-hidden className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-xs ${ICON[c.status][1]}`}>{ICON[c.status][0]}</span>
        <div className="flex-1 min-w-0"><div className="text-sm font-medium">{c.title}{c.status !== "ok" && !c.blocking && <span className="text-xs text-ink-soft font-normal"> · warning</span>}</div><div className="text-sm text-ink-soft">{c.detail}</div>
          {c.items.length > 0 && <ul className="mt-1 text-xs figure text-ink-soft space-y-0.5">{c.items.map((x, i) => <li key={i}>{x}</li>)}</ul>}{c.status !== "ok" && <Link className="text-xs text-primary font-medium hover:underline" to={c.link}>Resolve →</Link>}</div></li>))}</ul></Panel>}
    {closes.length > 0 && <Panel title="Closed months"><table className="w-full text-sm"><tbody>{closes.map((c) => <tr key={c.period} className="ledger-rule"><td className="py-2 figure">{c.period}</td><td>Closed by {c.closedByName}</td><td className="text-right text-ink-soft figure">{new Date(c.closedAt).toLocaleDateString("en-ZA")}</td></tr>)}</tbody></table></Panel>}
    {/^\d{4}-\d{2}$/.test(period) && <NotesPanel key={period} entityType="PERIOD" entityId={period} title={`Notes for ${period}`} />}</div>);
}
