"use client";
import { SkeletonRows } from "./ui/skeleton";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import { useAuth } from "../context/AuthContext";
import Panel from "./Panel"; import Button from "./Button";

const label = (d) => (d < 0 ? `${-d} day${d === -1 ? "" : "s"} before` : d === 0 ? "on the due date" : `${d} day${d === 1 ? "" : "s"} late`);
const STATUS = { SENT: "text-success", FAILED: "text-brick", NO_CHANNEL: "text-ink-soft" };

/** Settings > Payment reminders: switch on, choose the days, see what went out, and send what is due now. */
export default function RemindersPanel() {
  const { user } = useAuth(); const manager = ["OWNER", "ADMIN"].includes(user?.role);
  const [s, setS] = useState(null); const [days, setDays] = useState(""); const [busy, setBusy] = useState(null); const [msg, setMsg] = useState(null); const [error, setError] = useState(null);
  const load = () => api.get("/reminders").then((d) => { setS(d); setDays(d.schedule.join(", ")); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const run = async (key, fn) => { setBusy(key); setError(null); setMsg(null); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(null); } };
  const save = (patch) => run("save", async () => { await api.patch("/organization", patch); await load(); setMsg("Saved."); });
  const sendNow = () => run("send", async () => { const d = await api.post("/reminders/run"); const sent = d.results.filter((r) => r.status === "SENT").length, waiting = d.results.filter((r) => r.status === "NO_CHANNEL");
    setMsg(d.results.length === 0 ? "Nothing is due right now." : `${sent} reminder${sent === 1 ? "" : "s"} sent.${waiting.length ? ` ${waiting.length} could not be sent: ${waiting[0].detail}.` : ""}`); await load(); });
  if (!s) return <Panel title="Payment reminders">{error ? <p className="text-sm text-brick">{error}</p> : <SkeletonRows rows={4} />}</Panel>;
  const schedule = days.split(/[,\s]+/).filter(Boolean).map(Number);
  return (<div id="reminders"><Panel title="Payment reminders">
    <div className="space-y-4 text-sm">
      <p className="text-ink-soft">Nexus writes to customers about unpaid invoices: a friendly note before the due date, firmer ones after. Each email has the invoice attached and a link where the customer can see everything they owe and pay online. Turn it off for one customer from their statement.</p>
      <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={s.enabled} disabled={!manager || busy === "save"} onChange={(e) => save({ remindersEnabled: e.target.checked })} /> Send automatic payment reminders</label>
      <div className="flex flex-wrap items-end gap-3"><div><label className="label">Days from the due date (minus = before)</label><input className="field figure w-56" value={days} disabled={!manager} onChange={(e) => setDays(e.target.value)} /></div>
        {manager && <Button variant="secondary" disabled={busy === "save"} onClick={() => save({ reminderSchedule: schedule })}>Save days</Button>}</div>
      <p className="text-ink-soft">Reminders go out {schedule.every(Number.isFinite) ? schedule.map(label).join(", ") : "…"}.</p>
      <ul className="text-xs space-y-1">
        <li className={s.email ? "text-success" : "text-brick"}>{s.email ? "✓ Email is set up" : "✗ Email is not set up (RESEND_API_KEY): reminders cannot go out by email"}</li>
        <li className={s.whatsapp ? "text-success" : "text-ink-soft"}>{s.whatsapp ? "✓ WhatsApp is set up" : "WhatsApp is not set up (optional)"}</li>
        <li className={s.scheduled ? "text-success" : "text-brick"}>{s.scheduled ? "✓ Reminders are sent automatically every morning" : "✗ The daily job is not set up (CRON_SECRET): use “Send due reminders now”, or see DEPLOY.md"}</li></ul>
      {manager && <Button disabled={!!busy || !s.enabled} onClick={sendNow}>{busy === "send" ? "Sending…" : "Send due reminders now"}</Button>}
      {error && <p className="text-brick">{error}</p>}{msg && <p className="text-success">{msg}</p>}
      {s.reminders.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">When</th><th className="pb-2 font-normal">Invoice</th><th className="pb-2 font-normal">Customer</th><th className="pb-2 font-normal">Reminder</th><th className="pb-2 font-normal">Result</th></tr></thead>
        <tbody>{s.reminders.map((r) => <tr key={r.id} className="ledger-rule"><td className="py-1.5 figure">{new Date(r.createdAt).toLocaleDateString("en-ZA")}</td><td className="figure">{r.number}</td><td>{r.customer}</td><td>{label(r.stage)}</td>
          <td className={STATUS[r.status]}>{r.status === "SENT" ? `Sent by ${r.channels.map((c) => c.toLowerCase()).join(" and ")}` : `Failed${r.detail ? `: ${r.detail}` : ""}`}</td></tr>)}</tbody></table></div>}
    </div></Panel></div>);
}
