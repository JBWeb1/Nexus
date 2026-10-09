"use client";
import { PostRow, RulesPanel } from "../components/BankPost";
import { Fragment, useEffect, useState } from "react"; import { api } from "../api/client";
import Panel from "../components/Panel"; import Money from "../components/Money"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";
const todayStr = () => new Date().toISOString().slice(0, 10);
export default function Banking() {
  const [accounts, setAccounts] = useState(null); const [selected, setSelected] = useState(null); const [transactions, setTransactions] = useState([]); const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false); const [newAcc, setNewAcc] = useState({ name: "", bankName: "", openingBalance: "", openingDate: "" });
  const [showTxn, setShowTxn] = useState(false); const [txn, setTxn] = useState({ date: todayStr(), description: "", amount: "", type: "DEBIT" }); const [suggestions, setSuggestions] = useState({}); const [saving, setSaving] = useState(false);
  const loadAccounts = () => api.get("/bank-accounts").then((d) => { setAccounts(d.bankAccounts); setSelected((s) => s || d.bankAccounts[0]?.id || null); }).catch((e) => setError(e.message));
  const loadTxns = (id) => id && api.get(`/bank-accounts/${id}/transactions`).then((d) => setTransactions(d.transactions)).catch((e) => setError(e.message));
  const [coa, setCoa] = useState([]); const [taxes, setTaxes] = useState([]); const [posting, setPosting] = useState(null);
  useEffect(() => { loadAccounts(); api.get("/accounts").then((d) => setCoa(d.accounts)).catch(() => {}); api.get("/tax-rates").then((d) => setTaxes(d.taxRates)).catch(() => {}); }, []); useEffect(() => { loadTxns(selected); }, [selected]);
  async function createAccount(e) { e.preventDefault(); setSaving(true); setError(null);
    try { await api.post("/bank-accounts", { name: newAcc.name, bankName: newAcc.bankName || undefined, openingBalance: newAcc.openingBalance ? Number(newAcc.openingBalance) : 0, openingDate: newAcc.openingDate || undefined }); setNewAcc({ name: "", bankName: "", openingBalance: "", openingDate: "" }); setShowNew(false); loadAccounts(); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  async function addTxn(e) { e.preventDefault(); setSaving(true); setError(null);
    try { await api.post(`/bank-accounts/${selected}/transactions`, { ...txn, amount: Number(txn.amount) }); setTxn({ date: todayStr(), description: "", amount: "", type: "DEBIT" }); setShowTxn(false); loadTxns(selected); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  const findMatches = async (id) => { try { const d = await api.get(`/bank-accounts/${selected}/transactions/${id}/suggestions`); setSuggestions((p) => ({ ...p, [id]: d.suggestions })); } catch (e) { setError(e.message); } };
  const reconcile = async (id, body) => { try { await api.post(`/bank-accounts/${selected}/transactions/${id}/reconcile`, body); loadTxns(selected); } catch (e) { setError(e.message); } };
  if (!accounts) return <div className={error ? "text-brick" : "text-ink-soft"}>{error || "Loading…"}</div>;
  const current = accounts.find((a) => a.id === selected);
  return (<div className="space-y-6"><div className="flex items-center justify-between"><h1 className="font-display text-3xl">Banking</h1><Button onClick={() => setShowNew((s) => !s)}>{showNew ? "Cancel" : "Add bank account"}</Button></div><ErrorNote error={error} />
    {showNew && <Panel title="New bank account"><form onSubmit={createAccount} className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div><label className="label">Account name</label><input required className="field" value={newAcc.name} onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })} /></div>
      <div><label className="label">Bank</label><input className="field" value={newAcc.bankName} onChange={(e) => setNewAcc({ ...newAcc, bankName: e.target.value })} /></div>
      <div><label className="label">Opening balance</label><input type="number" step="0.01" min="0" className="field figure" value={newAcc.openingBalance} onChange={(e) => setNewAcc({ ...newAcc, openingBalance: e.target.value })} /></div>
      <div><label className="label">Balance as at</label><input type="date" className="field" value={newAcc.openingDate} onChange={(e) => setNewAcc({ ...newAcc, openingDate: e.target.value })} /></div>
      <div className="md:col-span-4"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add account"}</Button></div></form></Panel>}
    <div className="flex gap-2 flex-wrap">{accounts.map((a) => <button key={a.id} onClick={() => setSelected(a.id)} className={`chip ${selected === a.id ? "chip-on" : ""}`}>{a.name}</button>)}</div>
    {accounts.length === 0 && <p className="text-ink-soft text-sm">Add a bank account to start recording payments and reconciling transactions.</p>}
    {current && <Panel title={current.bankName ? `${current.name} (${current.bankName})` : current.name} action={<div className="flex items-center gap-4"><Money amount={current.currentBalance} className="text-lg" /><Button variant="secondary" onClick={() => setShowTxn((s) => !s)}>{showTxn ? "Cancel" : "Add transaction"}</Button></div>}>
      {showTxn && <form onSubmit={addTxn} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end mb-5 pb-5 ledger-rule">
        <div><label className="label">Date</label><input type="date" required className="field figure" value={txn.date} onChange={(e) => setTxn({ ...txn, date: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label">Description</label><input required className="field" value={txn.description} onChange={(e) => setTxn({ ...txn, description: e.target.value })} /></div>
        <div><label className="label">Amount</label><input type="number" step="0.01" min="0.01" required className="field figure" value={txn.amount} onChange={(e) => setTxn({ ...txn, amount: e.target.value })} /></div>
        <div><label className="label">Type</label><select className="field" value={txn.type} onChange={(e) => setTxn({ ...txn, type: e.target.value })}><option value="DEBIT">Money out</option><option value="CREDIT">Money in</option></select></div>
        <div className="col-span-2 md:col-span-5"><Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add"}</Button></div></form>}
      {transactions.length === 0 ? <p className="text-ink-soft text-sm">No bank statement transactions yet. Add them here (or import expenses) and match them to your ledger.</p> :
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">Description</th><th className="pb-2 font-normal text-right">Amount</th><th className="pb-2 font-normal pl-4">Status</th></tr></thead>
          <tbody>{transactions.map((t) => <Fragment key={t.id}><tr className="ledger-rule"><td className="py-2 figure text-ink-soft">{t.date}</td><td>{t.description}</td><td className="text-right"><Money amount={t.amount} tone={t.type === "CREDIT" ? "credit" : "debit"} /></td>
            <td className="pl-4">{t.reconciliationStatus === "UNMATCHED" ? <span className="space-x-3"><button onClick={() => findMatches(t.id)} className="text-xs text-primary font-medium hover:underline">Find match</button><button onClick={() => setPosting(posting === t.id ? null : t.id)} className="text-xs text-primary font-medium hover:underline">Post to account</button><button onClick={() => reconcile(t.id, { ignore: true })} className="text-xs text-ink-soft hover:underline">Ignore</button></span> : <span className="text-xs text-success">{t.reconciliationStatus === "MATCHED" ? "Matched" : "Ignored"}</span>}</td></tr>
            {posting === t.id && <tr><td colSpan={4}><PostRow bankId={selected} txn={t} accounts={coa} taxRates={taxes} onError={setError} onDone={() => { setPosting(null); loadTxns(selected); loadAccounts(); }} /></td></tr>}
            {suggestions[t.id] && <tr><td colSpan={4} className="pb-3">{suggestions[t.id].length === 0 ? <p className="text-xs text-ink-soft pl-2">No matching ledger entries within 14 days.</p> : <div className="pl-2 space-y-1">{suggestions[t.id].map((s) => <div key={s.journalLineId} className="flex items-center justify-between text-xs bg-paper rounded-sm px-3 py-2"><span>{s.description} — <span className="figure">{s.date}</span></span><button onClick={() => reconcile(t.id, { journalLineId: s.journalLineId })} className="text-primary font-medium hover:underline">Match this</button></div>)}</div>}</td></tr>}</Fragment>)}</tbody></table></div>}
      <RulesPanel bankId={selected} accounts={coa} taxRates={taxes} onApplied={() => { loadTxns(selected); loadAccounts(); }} /></Panel>}</div>);
}
