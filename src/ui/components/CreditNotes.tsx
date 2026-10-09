"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import { downloadFile } from "../api/download";
import Panel from "./Panel"; import Money from "./Money"; import Button from "./Button"; import ErrorNote from "./ErrorNote"; import StatusPill from "./StatusPill";
const today = () => new Date().toISOString().slice(0, 10);
export default function CreditNotes({ invoice, onChange }) {
  const [notes, setNotes] = useState([]); const [open, setOpen] = useState(false); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState({}); const [reason, setReason] = useState(""); const [date, setDate] = useState(today());
  const load = () => api.get(`/credit-notes?invoiceId=${invoice.id}`).then((d) => setNotes(d.creditNotes)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [invoice.id, invoice.status]);
  const canIssue = ["SENT", "PARTIAL"].includes(invoice.status);
  const lines = invoice.lines || [];
  const picked = lines.map((l) => ({ l, q: Number(qty[l.id] || 0) })).filter((x) => x.q > 0);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      await api.post(`/invoices/${invoice.id}/credit-notes`, { issueDate: date, reason, lines: picked.map(({ l, q }) => ({ description: l.description, quantity: q, unitPrice: l.unitPrice, accountId: l.accountId, taxRateId: l.taxRateId || undefined })) });
      setOpen(false); setQty({}); setReason(""); await load(); onChange && (await onChange());
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function voidNote(n) { if (!window.confirm(`Void credit note ${n.number}? The invoice balance goes back up.`)) return; setError(null); try { await api.post(`/credit-notes/${n.id}/void`); await load(); onChange && (await onChange()); } catch (e) { setError(e.message); } }
  if (!canIssue && notes.length === 0) return null;
  return (<Panel title="Credit notes" action={canIssue && <Button variant="secondary" onClick={() => setOpen((o) => !o)}>{open ? "Cancel" : "Issue credit note"}</Button>}>
    <ErrorNote error={error} />
    {open && <form onSubmit={submit} className="mb-5 pb-5 ledger-rule space-y-3">
      <p className="text-sm text-ink-soft">Enter how many of each line to credit. The invoice is never edited; a credit note reduces what is owed and reverses the VAT.</p>
      <table className="w-full text-sm"><thead><tr className="text-left text-ink-soft"><th className="font-normal pb-1">Line</th><th className="font-normal text-right pb-1">Invoiced</th><th className="font-normal text-right pb-1 w-28">Credit qty</th></tr></thead>
        <tbody>{lines.map((l) => <tr key={l.id} className="ledger-rule"><td className="py-2">{l.description}</td><td className="text-right figure">{l.quantity} × <Money amount={l.unitPrice} currency={invoice.currency} /></td>
          <td className="text-right"><input type="number" min="0" max={l.quantity} step="any" className="field figure w-24 text-right" aria-label={`Credit quantity for ${l.description}`} value={qty[l.id] ?? ""} onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })} /></td></tr>)}</tbody></table>
      <button type="button" className="text-xs text-primary font-medium hover:underline" onClick={() => setQty(Object.fromEntries(lines.map((l) => [l.id, l.quantity])))}>Fill all lines</button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="md:col-span-2"><label className="label">Reason</label><input className="field" placeholder="e.g. Goods returned" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <div><label className="label">Date</label><input type="date" required className="field figure" value={date} onChange={(e) => setDate(e.target.value)} /></div></div>
      <Button type="submit" disabled={busy || picked.length === 0}>{busy ? "Issuing…" : "Issue credit note"}</Button></form>}
    {notes.length === 0 ? <p className="text-sm text-ink-soft">No credit notes yet.</p> :
      <table className="w-full text-sm"><tbody>{notes.map((n) => <tr key={n.id} className="ledger-rule"><td className="py-2 figure">{n.number}</td><td className="text-ink-soft figure">{n.issueDate}</td><td className="text-ink-soft">{n.reason}</td><td className="text-right"><Money amount={n.total} currency={n.currency} /></td><td className="pl-4"><StatusPill status={n.status} /></td>
        <td className="text-right space-x-3 whitespace-nowrap"><button className="text-xs text-primary font-medium hover:underline" onClick={() => downloadFile(`/credit-notes/${n.id}/pdf`, `${n.number}.pdf`).catch((e) => setError(e.message))}>PDF</button>{n.status !== "VOID" && <button className="text-xs text-brick hover:underline" onClick={() => voidNote(n)}>Void</button>}</td></tr>)}</tbody></table>}
  </Panel>);
}
