"use client";
import Attachments from "./Attachments";
import DocExtras from "./DocExtras"; import CreditNotes from "./CreditNotes";
import { useEffect, useState } from "react"; import { useParams, useNavigate, Link } from "@/ui/lib/router";
import { api } from "../api/client"; import Panel from "./Panel"; import Money from "./Money"; import Button from "./Button"; import StatusPill from "./StatusPill"; import ErrorNote from "./ErrorNote";
import { DOCS, ACTIONS } from "./docConfigs";
const today = () => new Date().toISOString().slice(0, 10);
import NotesPanel from "./Notes";
const NOTE_TYPE = { invoices: "INVOICE", bills: "BILL", quotes: "QUOTE" };
export default function DocumentDetail({ kind }) {
  const cfg = DOCS[kind]; const { id } = useParams(); const nav = useNavigate();
  const [doc, setDoc] = useState(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(false); const [banks, setBanks] = useState([]);
  const [showPay, setShowPay] = useState(false); const [pay, setPay] = useState({ bankAccountId: "", amount: "", date: today(), feeAmount: "", reference: "" });
  const load = () => api.get(`${cfg.path}/${id}`).then((d) => { setDoc(d[cfg.itemKey]); }).catch((e) => setError(e.message));
  useEffect(() => { load(); if (cfg.payPath) api.get("/bank-accounts").then((d) => { setBanks(d.bankAccounts); setPay((p) => ({ ...p, bankAccountId: d.bankAccounts[0]?.id || "" })); }); }, [id, kind]);
  const outstanding = doc ? Math.round((doc.total - (doc.amountPaid || 0)) * 100) / 100 : 0;
  async function act(label, suffix, confirm) {
    if (confirm && !window.confirm(`${label} this ${cfg.singular.toLowerCase()}?`)) return;
    // Converting a quote: date the invoice the day the work was agreed, which is not always today.
    let body; if (suffix === "convert") { const d = window.prompt("Date for the new invoice (YYYY-MM-DD)", today()); if (d === null) return; body = { issueDate: d.trim() }; }
    setBusy(true); setError(null);
    try { const d = await api.post(`${cfg.path}/${id}/${suffix}`, body); if (suffix === "convert") nav(`/invoices/${d.invoice.id}`); else { setDoc(d[cfg.itemKey]); } }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function submitPay(e) {
    e.preventDefault(); setBusy(true); setError(null);
    try { await api.post(cfg.payPath, { [cfg.payIdField]: id, bankAccountId: pay.bankAccountId, amount: Number(pay.amount), date: pay.date, feeAmount: Number(pay.feeAmount || 0), reference: pay.reference || undefined }); setShowPay(false); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function reversePay(pid) { if (!window.confirm("Reverse this payment?")) return; setBusy(true); try { await api.post(`/payments/${pid}/reverse`, { date: today() }); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  if (!doc) return <div className={error ? "text-brick" : "text-ink-soft"}>{error || "Loading…"}</div>;
  const actions = ACTIONS[kind]?.[doc.status] || []; const canPay = cfg.openStatuses?.includes(doc.status);
  return (<div className="space-y-6 max-w-5xl">
    <div className="flex items-start justify-between flex-wrap gap-3"><div><Link to={cfg.route} className="text-sm text-ink-soft hover:underline">← {cfg.title}</Link>
      <h1 className="font-display text-3xl mt-1 flex items-center gap-3"><span className="figure">{doc.number}</span><StatusPill status={doc.status} /></h1></div>
      <div className="flex gap-2 flex-wrap">{actions.map(([label, suffix, variant, confirm]) => <Button key={suffix} variant={variant} disabled={busy} onClick={() => act(label, suffix, confirm)}>{label}</Button>)}
        {canPay && <Button variant="gold" onClick={() => { setPay((p) => ({ ...p, amount: String(outstanding) })); setShowPay((s) => !s); }}>{cfg.paidVerb}</Button>}
        {(kind === "invoices" || kind === "quotes") && doc.status !== "DRAFT" && <DocExtras path={cfg.path} doc={doc} payLink={kind === "invoices" && ["SENT", "PARTIAL"].includes(doc.status)} onError={setError} />}
        {doc.convertedInvoiceId && <Link to={`/invoices/${doc.convertedInvoiceId}`}><Button variant="secondary">View invoice</Button></Link>}</div></div>
    <ErrorNote error={error} />
    {showPay && <Panel title={cfg.paidVerb}><form onSubmit={submitPay} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div><label className="label">Bank account</label><select required className="field" value={pay.bankAccountId} onChange={(e) => setPay({ ...pay, bankAccountId: e.target.value })}>{banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>{banks.length === 0 && <p className="text-xs text-brick mt-1">Add a bank account under Banking first.</p>}</div>
      <div><label className="label">Amount (outstanding {outstanding})</label><input required type="number" step="0.01" max={outstanding} className="field figure" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} placeholder={String(outstanding)} /></div>
      <div><label className="label">Date</label><input required type="date" className="field figure" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></div>
      {cfg.allowFee && <div><label className="label">Gateway fee (optional)</label><input type="number" step="0.01" min="0" className="field figure" value={pay.feeAmount} onChange={(e) => setPay({ ...pay, feeAmount: e.target.value })} /></div>}
      <div className="md:col-span-4"><Button type="submit" disabled={busy || !banks.length}>Save payment</Button></div></form></Panel>}
    <Panel><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div><div className="text-ink-soft">{cfg.contactLabel}</div><div>{doc.contact?.name}</div></div><div><div className="text-ink-soft">Date</div><div className="figure">{doc.issueDate}</div></div>
      <div><div className="text-ink-soft">{cfg.dueLabel}</div><div className="figure">{doc[cfg.dueField] || "—"}</div></div><div><div className="text-ink-soft">Currency</div><div>{doc.currency}{doc.currency !== "ZAR" && <span className="figure text-ink-soft"> @ {doc.exchangeRate}</span>}</div></div></div></Panel>
    <Panel title="Line items"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Description</th><th className="pb-2 font-normal">Account</th><th className="pb-2 font-normal text-right">Qty</th><th className="pb-2 font-normal text-right">Price</th><th className="pb-2 font-normal text-right">Total</th></tr></thead>
      <tbody>{doc.lines.map((l) => <tr key={l.id} className="ledger-rule"><td className="py-2">{l.description}</td><td className="text-ink-soft">{l.accountName}</td><td className="text-right figure">{l.quantity}</td><td className="text-right"><Money amount={l.unitPrice} currency={doc.currency} /></td><td className="text-right"><Money amount={l.lineTotal} currency={doc.currency} /></td></tr>)}</tbody></table></div>
      <div className="mt-5 ml-auto max-w-xs space-y-1 text-sm"><div className="flex justify-between"><span className="text-ink-soft">Subtotal</span><Money amount={doc.subtotal} currency={doc.currency} /></div><div className="flex justify-between"><span className="text-ink-soft">VAT</span><Money amount={doc.taxTotal} currency={doc.currency} /></div>
        <div className="flex justify-between border-t border-hairline pt-2 font-medium"><span>Total</span><Money amount={doc.total} currency={doc.currency} /></div>
        {cfg.payPath && <><div className="flex justify-between"><span className="text-ink-soft">Paid</span><Money amount={doc.amountPaid} currency={doc.currency} tone="credit" /></div><div className="flex justify-between font-medium"><span>Balance due</span><Money amount={outstanding} currency={doc.currency} tone={outstanding > 0 ? "debit" : "credit"} /></div></>}</div></Panel>
    {doc.payments?.length > 0 && <Panel title="Payments"><table className="w-full text-sm"><tbody>{doc.payments.map((p) => <tr key={p.id} className="ledger-rule"><td className="py-2 figure text-ink-soft">{p.date}</td><td>{p.reference || p.gateway || "Payment"}</td><td className="text-right"><Money amount={p.amount} currency={doc.currency} /></td><td className="pl-4"><StatusPill status={p.status} /></td>
      <td className="text-right">{p.status === "COMPLETED" && <button className="text-xs text-brick hover:underline" onClick={() => reversePay(p.id)}>Reverse</button>}</td></tr>)}</tbody></table></Panel>}
    {kind === "invoices" && <CreditNotes invoice={doc} onChange={load} />}
    {doc.notes && <Panel title="Document notes"><p className="text-sm whitespace-pre-wrap">{doc.notes}</p></Panel>}
    {NOTE_TYPE[kind] && <Attachments entityType={NOTE_TYPE[kind]} entityId={doc.id} />}
    {NOTE_TYPE[kind] && <NotesPanel entityType={NOTE_TYPE[kind]} entityId={doc.id} title="Internal notes" />}</div>);
}
