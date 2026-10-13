"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import { downloadFile } from "../api/download";
import Panel from "./Panel"; import Button from "./Button"; import Money from "./Money";

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const R = (n) => "R " + Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const AGE = [["current", "Current"], ["d1_30", "1-30 days"], ["d31_60", "31-60 days"], ["d61_90", "61-90 days"], ["d90plus", "90+ days"]];

/** A customer's statement with ways to send it: PDF, email, a portal link to copy, or WhatsApp. */
export default function StatementPanel({ contact, onClose, onChanged }) {
  const [from, setFrom] = useState(daysAgo(89)); const [to, setTo] = useState(today()); const [s, setS] = useState(null);
  const [msg, setMsg] = useState(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(null);
  const q = `from=${from}&to=${to}`;
  useEffect(() => { setS(null); api.get(`/contacts/${contact.id}/statement?${q}`).then((d) => setS(d.statement)).catch((e) => setError(e.message)); }, [contact.id, q]);
  const run = async (key, fn) => { setBusy(key); setError(null); setMsg(null); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(null); } };
  const link = async () => (await api.post(`/contacts/${contact.id}/portal-link`)).url;
  const copyLink = () => run("copy", async () => { const url = await link(); try { await navigator.clipboard.writeText(url); setMsg("Portal link copied. Anyone with it can see this customer's invoices and pay, so share it only with them."); } catch { setMsg(url); } });
  const whatsapp = () => run("wa", async () => { const url = await link();
    const text = `Hi ${contact.name}, your statement from us shows ${R(s?.closingBalance)} due. You can see your invoices and pay here: ${url}`;
    window.open(`https://wa.me/${String(contact.phone || "").replace(/\D/g, "").replace(/^0/, "27")}?text=${encodeURIComponent(text)}`, "_blank", "noopener"); });
  const email = () => run("email", async () => { const d = await api.post(`/contacts/${contact.id}/statement/email`, { from, to }); setMsg(`Statement emailed to ${d.sentTo}.`); });
  const pdf = () => run("pdf", () => downloadFile(`/contacts/${contact.id}/statement/pdf?${q}`, `Statement ${contact.name} ${to}.pdf`));
  const pause = () => run("pause", async () => { await api.patch(`/contacts/${contact.id}`, { remindersPaused: !contact.remindersPaused }); onChanged?.(); });
  const revoke = () => run("revoke", async () => { if (!window.confirm("Turn off every portal link sent to this customer? Links in earlier emails will stop working.")) return; const d = await api.delete(`/contacts/${contact.id}/portal-link`); setMsg(`${d.revoked} link${d.revoked === 1 ? "" : "s"} turned off.`); });

  return (<Panel title={`Statement: ${contact.name}`} action={<Button variant="secondary" onClick={onClose}>Close</Button>}>
    <div className="flex flex-wrap gap-4 items-end mb-4">
      <div><label className="label">From</label><input type="date" className="field figure" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
      <div><label className="label">To</label><input type="date" className="field figure" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={!!busy} onClick={pdf}>Download PDF</Button><Button variant="secondary" disabled={!!busy || !s} onClick={email}>{busy === "email" ? "Sending…" : "Email"}</Button>
        {contact.phone && <Button variant="secondary" disabled={!!busy || !s} onClick={whatsapp}>WhatsApp</Button>}<Button variant="secondary" disabled={!!busy} onClick={copyLink}>Copy portal link</Button></div></div>
    {error && <p className="text-sm text-brick mb-3">{error}</p>}{msg && <p className="text-sm text-success mb-3 break-all">{msg}</p>}
    {!s ? <p className="text-sm text-ink-soft">Loading…</p> : <>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">Reference</th><th className="pb-2 font-normal">Details</th><th className="pb-2 font-normal text-right">Charged</th><th className="pb-2 font-normal text-right">Paid</th><th className="pb-2 font-normal text-right">Balance</th></tr></thead>
        <tbody><tr className="ledger-rule text-ink-soft"><td className="py-1.5 figure">{s.from}</td><td /><td>Balance brought forward</td><td /><td /><td className="text-right"><Money amount={s.openingBalance} /></td></tr>
          {s.lines.map((l, i) => <tr key={i} className="ledger-rule"><td className="py-1.5 figure">{l.date}</td><td className="figure">{l.reference}</td><td>{l.description}</td><td className="text-right">{l.debit ? <Money amount={l.debit} /> : ""}</td><td className="text-right">{l.credit ? <Money amount={l.credit} /> : ""}</td><td className="text-right"><Money amount={l.balance} /></td></tr>)}
          <tr className="font-medium"><td /><td /><td className="py-2">Balance due</td><td /><td /><td className="text-right"><Money amount={s.closingBalance} /></td></tr></tbody></table></div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">{AGE.map(([k, l]) => <div key={k} className="rounded-lg border border-border p-2 text-center"><div className="text-xs text-ink-soft">{l}</div><div className="figure text-sm"><Money amount={s.ageing[k]} /></div></div>)}</div>
      {s.mixedCurrencies && <p className="text-xs text-brick mt-2">This customer has invoices in more than one currency; amounts are shown as invoiced.</p>}</>}
    <div className="flex flex-wrap gap-4 items-center mt-4 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={!contact.remindersPaused} disabled={busy === "pause"} onChange={pause} /> Send this customer automatic payment reminders</label>
      <button className="text-xs text-brick hover:underline" disabled={!!busy} onClick={revoke}>Turn off portal links</button></div>
  </Panel>);
}
