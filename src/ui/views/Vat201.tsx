"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import { useAuth } from "../context/AuthContext";
import Panel from "../components/Panel"; import Money from "../components/Money"; import Button from "../components/Button"; import StatusPill from "../components/StatusPill"; import ErrorNote from "../components/ErrorNote";
const ENDS = { A: [1, 3, 5, 7, 9, 11], B: [2, 4, 6, 8, 10, 12], C: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], D: [2, 8] }; const LEN = { A: 2, B: 2, C: 1, D: 6 };
const lastPeriod = (cycle = "B") => { const n = new Date(); let y = n.getFullYear(), m = n.getMonth(); if (m === 0) { m = 12; y -= 1; } /* m = last completed month (1-12) */ const ends = ENDS[cycle] || ENDS.B; let e = [...ends].reverse().find((x) => x <= m); if (!e) { e = ends[ends.length - 1]; y -= 1; } let sm = e - (LEN[cycle] || 2) + 1, sy = y; if (sm < 1) { sm += 12; sy -= 1; } const pad = (k) => String(k).padStart(2, "0"); return [`${sy}-${pad(sm)}-01`, `${y}-${pad(e)}-${pad(new Date(y, e, 0).getDate())}`]; };
const monthRange = () => { const d = new Date(); const y = d.getFullYear(), m = d.getMonth(); const pad = (n) => String(n).padStart(2, "0"); return [`${y}-${pad(m + 1)}-01`, `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`]; };
export default function Vat201() {
  const { org } = useAuth();
  const [[from, to], setRange] = useState(() => lastPeriod(org?.vatCycle)); const [v, setV] = useState(null); const [periods, setPeriods] = useState([]); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const loadPeriods = () => api.get("/vat-periods").then((d) => setPeriods(d.vatPeriods)).catch((e) => setError(e.message));
  const preview = () => { setError(null); api.get(`/reports/vat201?from=${from}&to=${to}`).then((d) => setV(d.vat201)).catch((e) => { setV(null); setError(e.message); }); };
  useEffect(() => { loadPeriods(); }, []); useEffect(preview, [from, to]);
  async function finalize() {
    if (!window.confirm(`Finalize VAT for ${from} to ${to}? This posts the settlement to SARS Payable and locks the period against further changes.`)) return;
    setBusy(true); setError(null); try { await api.post("/vat-periods/finalize", { periodStart: from, periodEnd: to }); await loadPeriods(); preview(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const Row = ({ label, children, strong = false }: { label: string; children: React.ReactNode; strong?: boolean }) => <div className={`flex justify-between py-2 ledger-rule ${strong ? "font-medium text-base" : "text-sm"}`}><span className={strong ? "" : "text-ink-soft"}>{label}</span>{children}</div>;
  return (<div className="space-y-6 max-w-3xl"><h1 className="font-display text-3xl">VAT201</h1><ErrorNote error={error} />
    <Panel title="Period"><div className="flex gap-4 items-end flex-wrap"><div><label className="label">From</label><input type="date" className="field figure" value={from} onChange={(e) => setRange([e.target.value, to])} /></div><div><label className="label">To</label><input type="date" className="field figure" value={to} onChange={(e) => setRange([from, e.target.value])} /></div></div></Panel>
    {v && <Panel title="Preview" action={<Button variant="gold" disabled={busy} onClick={finalize}>{busy ? "Finalizing…" : "Finalize period"}</Button>}>
      <Row label="Standard-rated sales (excl. VAT)"><Money amount={v.standardRatedSales} /></Row><Row label="Zero-rated / exempt sales"><Money amount={v.zeroRatedSales} /></Row><Row label="Standard-rated purchases (excl. VAT)"><Money amount={v.standardRatedPurchases} /></Row>
      <Row label="Output VAT"><Money amount={v.outputVat} tone="credit" /></Row><Row label="Input VAT"><Money amount={v.inputVat} tone="debit" /></Row>
      <Row label={v.netVat >= 0 ? "VAT payable to SARS" : "VAT refund due from SARS"} strong><Money amount={Math.abs(v.netVat)} tone={v.netVat >= 0 ? "debit" : "credit"} /></Row>
      <p className="text-xs text-ink-soft mt-4">Figures come straight from the ledger (VAT Output 2100 and VAT Input 2110). Review before filing on SARS eFiling — this preview does not submit to SARS.</p></Panel>}
    <Panel title="Finalized periods">{periods.length === 0 ? <p className="text-sm text-ink-soft">No finalized periods yet.</p> : <table className="w-full text-sm"><tbody>{periods.map((p) => <tr key={p.id} className="ledger-rule"><td className="py-2 figure">{p.periodStart} → {p.periodEnd}</td><td className="text-right"><Money amount={p.netVat} /></td><td className="pl-4"><StatusPill status={p.status} /></td></tr>)}</tbody></table>}</Panel></div>);
}
