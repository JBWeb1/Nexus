"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client";
import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";
const R = (n) => "R " + Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CONVENTION = {
  POSITIVE_IS_EXPENSE: "Positive amounts are read as spending; amounts in brackets or with a minus sign as refunds.",
  NEGATIVE_IS_EXPENSE: "This looks like a bank export: negative amounts are read as spending, positive amounts as money back in.",
  IN_OUT_COLUMNS: "Read from the separate Money in / Money out columns.",
};
const SOURCE = { category: "from the sheet", rule: "saved rule", history: "used before" };
const DUP = { ALREADY_IMPORTED: "Already on the books", TWICE_IN_FILE: "Appears twice in this file" };
const today = () => new Date().toISOString().slice(0, 10);

export default function ImportExpenses() {
  const [tab, setTab] = useState("expenses");
  return (<div className="space-y-6 max-w-6xl"><h1 className="font-display text-3xl">Import</h1>
    <div className="flex gap-2"><button className={`chip ${tab === "expenses" ? "chip-on" : ""}`} onClick={() => setTab("expenses")}>Expenses and refunds</button>
      <button className={`chip ${tab === "opening" ? "chip-on" : ""}`} onClick={() => setTab("opening")}>Opening debtors and creditors</button></div>
    {tab === "expenses" ? <Expenses /> : <Opening />}</div>);
}

function Expenses() {
  const [banks, setBanks] = useState([]); const [accounts, setAccounts] = useState([]); const [rates, setRates] = useState([]); const [bankId, setBankId] = useState("");
  const [preview, setPreview] = useState(null); const [rows, setRows] = useState(null); const [result, setResult] = useState(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { Promise.all([api.get("/bank-accounts"), api.get("/accounts"), api.get("/tax-rates")]).then(([b, a, t]) => { setBanks(b.bankAccounts); setBankId(b.bankAccounts[0]?.id || ""); setAccounts(a.accounts.filter((x) => x.type === "EXPENSE" && x.isActive)); setRates(t.taxRates); }).catch((e) => setError(e.message)); }, []);
  async function upload(e) {
    const file = e.target.files[0]; if (!file) return; setBusy(true); setError(null); setResult(null);
    try { const fd = new FormData(); fd.append("file", file);
      const d = await api.upload("/import/expenses/preview", fd); setPreview(d);
      setRows(d.rows.map((r) => ({ ...r, taxRateId: r.taxRateId || "", include: r.valid && !r.duplicate, remember: false })));
    } catch (err) { setError(err.message); setRows(null); } finally { setBusy(false); e.target.value = ""; }
  }
  const edit = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const rateOf = (id) => Number(rates.find((t) => t.id === id)?.rate || 0);
  const vatOf = (r) => { const g = Number(r.amount) || 0, rt = rateOf(r.taxRateId); return rt > 0 ? Math.round((g - g / (1 + rt / 100)) * 100) / 100 : 0; };
  const chosen = (rows || []).filter((r) => r.include);
  const spent = chosen.filter((r) => r.direction === "EXPENSE").reduce((s, r) => s + Number(r.amount || 0), 0), back = chosen.filter((r) => r.direction === "REFUND").reduce((s, r) => s + Number(r.amount || 0), 0);
  const vat = chosen.reduce((s, r) => s + (r.direction === "EXPENSE" ? 1 : -1) * vatOf(r), 0);
  async function commit() {
    setBusy(true); setError(null);
    try { const d = await api.post("/import/expenses/commit", { bankAccountId: bankId, rows: chosen.map((r) => ({ rowNumber: r.rowNumber, date: r.date, description: r.description, amount: Number(r.amount), direction: r.direction, accountId: r.accountId, taxRateId: r.taxRateId || null, remember: r.remember })) }); setResult(d); setRows(null); setPreview(null); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (<><ErrorNote error={error} />
    <Panel title="1. Upload a spreadsheet"><p className="text-sm text-ink-soft mb-3">Excel (.xlsx) or CSV with a header row: Date, Description and Amount (or separate Money in / Money out columns), plus an optional Category column. SA dates (dd/mm/yyyy) and amounts like “R 1 250,00” or “(99,00)” are understood. Rows already on your books are spotted and left unticked.</p>
      <input type="file" accept=".xlsx,.csv" onChange={upload} disabled={busy} className="text-sm" /></Panel>
    {rows && <Panel title="2. Review and map" action={<div className="flex items-center gap-3"><select className="field !w-auto" value={bankId} onChange={(e) => setBankId(e.target.value)}>{banks.map((b) => <option key={b.id} value={b.id}>Bank account: {b.name}</option>)}</select><Button disabled={busy || !bankId || !chosen.length} onClick={commit}>{busy ? "Importing…" : `Import ${chosen.length} rows`}</Button></div>}>
      {banks.length === 0 && <p className="text-sm text-brick mb-3">Add a bank account under Banking first.</p>}
      <p className="text-sm text-ink-soft mb-3">{CONVENTION[preview?.convention]} Change any row's type if it is wrong.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal w-8" /><th className="pb-2 font-normal">Row</th><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">Description</th><th className="pb-2 font-normal">Type</th><th className="pb-2 font-normal">Amount</th><th className="pb-2 font-normal">Expense account</th>{preview?.vatRegistered && <th className="pb-2 font-normal">VAT</th>}<th className="pb-2 font-normal" title="Save as a rule for future imports and the bank feed">Always</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className={`ledger-rule align-top ${!r.valid ? "bg-brick/5" : r.duplicate ? "bg-gold/10" : ""}`}>
          <td className="pt-2"><input type="checkbox" checked={r.include} disabled={!r.valid} onChange={(e) => edit(i, "include", e.target.checked)} /></td><td className="figure text-ink-soft pt-2">{r.rowNumber}</td>
          <td><input type="date" className="field figure !py-1" value={r.date || ""} onChange={(e) => edit(i, "date", e.target.value)} /></td>
          <td><input className="field !py-1" value={r.description} onChange={(e) => edit(i, "description", e.target.value)} />
            {r.duplicate && <p className="text-xs text-gold mt-1">{DUP[r.duplicate]}: left out unless you tick it.</p>}
            {r.needsTaxInvoice && r.taxRateId && rateOf(r.taxRateId) > 0 && <p className="text-xs text-ink-soft mt-1">Over R5,000: keep the supplier's full tax invoice to claim this VAT.</p>}</td>
          <td><select className="field !py-1" value={r.direction} onChange={(e) => edit(i, "direction", e.target.value)}><option value="EXPENSE">Expense</option><option value="REFUND">Refund</option></select></td>
          <td><input type="number" step="0.01" className="field figure !py-1 w-28" value={r.amount ?? ""} onChange={(e) => edit(i, "amount", e.target.value)} /></td>
          <td><select className="field !py-1" value={r.accountId} onChange={(e) => edit(i, "accountId", e.target.value)}><option value="">Select…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select>
            {SOURCE[r.accountSource] && <p className="text-xs text-ink-soft mt-1">Suggested: {SOURCE[r.accountSource]}</p>}</td>
          {preview?.vatRegistered && <td><select className="field !py-1" value={r.taxRateId} onChange={(e) => edit(i, "taxRateId", e.target.value)}><option value="">No VAT</option>{rates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            {vatOf(r) > 0 && <p className="text-xs text-ink-soft mt-1 figure">VAT {R(vatOf(r))}</p>}</td>}
          <td className="pt-2"><input type="checkbox" checked={r.remember} disabled={!r.valid} onChange={(e) => edit(i, "remember", e.target.checked)} /></td></tr>)}</tbody></table></div>
      <div className="flex gap-6 flex-wrap text-sm mt-4"><span>Spent: <b className="figure">{R(spent)}</b></span><span>Refunds: <b className="figure">{R(back)}</b></span>{preview?.vatRegistered && <span>VAT to claim: <b className="figure">{R(vat)}</b></span>}</div>
      {rows.some((r) => !r.valid) && <p className="text-xs text-brick mt-3">Highlighted rows are missing a valid date or amount. Fix them to include them.</p>}</Panel>}
    {result && <Panel title="Import result"><p className="text-sm text-success">Imported {result.imported} row{result.imported === 1 ? "" : "s"}{result.refunds ? ` (${result.refunds} refund${result.refunds === 1 ? "" : "s"})` : ""}.{result.vatClaimed ? ` VAT claimed: ${R(result.vatClaimed)}.` : ""}{result.rulesCreated ? ` ${result.rulesCreated} rule${result.rulesCreated === 1 ? "" : "s"} saved for next time.` : ""}</p>
      {[...result.duplicates, ...result.failed].length > 0 && <div className="mt-3"><p className="text-sm text-brick">{result.duplicates.length + result.failed.length} row(s) were skipped (the rest were imported):</p><ul className="text-sm mt-1 space-y-1">{[...result.duplicates, ...result.failed].map((f, i) => <li key={i}>Row <span className="figure">{f.rowNumber}</span>: {f.error}</li>)}</ul></div>}</Panel>}</>);
}

function Opening() {
  const [kind, setKind] = useState("DEBTORS"); const [asAt, setAsAt] = useState(today()); const [rows, setRows] = useState(null); const [result, setResult] = useState(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  async function upload(e) {
    const file = e.target.files[0]; if (!file) return; setBusy(true); setError(null); setResult(null);
    try { const fd = new FormData(); fd.append("file", file); fd.append("kind", kind); const d = await api.upload("/import/opening-balances/preview", fd); setRows(d.rows.map((r) => ({ ...r, include: r.valid }))); }
    catch (err) { setError(err.message); setRows(null); } finally { setBusy(false); e.target.value = ""; }
  }
  const edit = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const chosen = (rows || []).filter((r) => r.include); const total = chosen.reduce((s, r) => s + Number(r.amount || 0), 0);
  async function commit() {
    setBusy(true); setError(null);
    try { setResult(await api.post("/import/opening-balances/commit", { kind, asAt, rows: chosen.map((r) => ({ rowNumber: r.rowNumber, contactName: r.contactName, reference: r.reference, date: r.date, dueDate: r.dueDate, amount: Number(r.amount) })) })); setRows(null); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const who = kind === "DEBTORS" ? "Customer" : "Supplier";
  return (<><ErrorNote error={error} />
    <Panel title="1. What are you bringing over?"><p className="text-sm text-ink-soft mb-3">Moving from another system or a spreadsheet? Bring over the invoices customers still owe you and the bills you still owe, as at the day you start using Nexus. They show in aged debtors and creditors and can be paid as normal. They do not count as sales, expenses or VAT again, because your old books already did.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div><label className="label">Type</label><select className="field" value={kind} onChange={(e) => { setKind(e.target.value); setRows(null); }}><option value="DEBTORS">Debtors: customers who owe you</option><option value="CREDITORS">Creditors: suppliers you owe</option></select></div>
        <div><label className="label">Books move over on</label><input type="date" className="field" value={asAt} onChange={(e) => setAsAt(e.target.value)} /></div>
        <div><label className="label">Spreadsheet: {who}, Invoice/Reference, Date, Due date, Amount owing</label><input type="file" accept=".xlsx,.csv" onChange={upload} disabled={busy} className="text-sm" /></div></div></Panel>
    {rows && <Panel title="2. Check the amounts owing" action={<Button disabled={busy || !chosen.length} onClick={commit}>{busy ? "Importing…" : `Bring over ${chosen.length} (${R(total)})`}</Button>}>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal w-8" /><th className="pb-2 font-normal">Row</th><th className="pb-2 font-normal">{who}</th><th className="pb-2 font-normal">Reference</th><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">Due</th><th className="pb-2 font-normal">Amount owing</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className={`ledger-rule ${r.valid ? "" : "bg-brick/5"}`}>
          <td><input type="checkbox" checked={r.include} disabled={!r.valid} onChange={(e) => edit(i, "include", e.target.checked)} /></td><td className="figure text-ink-soft">{r.rowNumber}</td>
          <td><input className="field !py-1" value={r.contactName} onChange={(e) => edit(i, "contactName", e.target.value)} />{!r.contactId && r.valid && <p className="text-xs text-ink-soft mt-1">New {who.toLowerCase()}: will be added</p>}</td>
          <td><input className="field !py-1 w-28" value={r.reference} onChange={(e) => edit(i, "reference", e.target.value)} /></td>
          <td><input type="date" className="field figure !py-1" value={r.date || ""} onChange={(e) => edit(i, "date", e.target.value)} /></td>
          <td><input type="date" className="field figure !py-1" value={r.dueDate || ""} onChange={(e) => edit(i, "dueDate", e.target.value)} /></td>
          <td><input type="number" step="0.01" className="field figure !py-1 w-32" value={r.amount ?? ""} onChange={(e) => edit(i, "amount", e.target.value)} /></td></tr>)}</tbody></table></div></Panel>}
    {result && <Panel title="Result"><p className="text-sm text-success">Brought over {result.imported} {kind === "DEBTORS" ? "invoice" : "bill"}{result.imported === 1 ? "" : "s"} totalling {R(result.total)}.{result.contactsCreated ? ` ${result.contactsCreated} new contact${result.contactsCreated === 1 ? "" : "s"} added.` : ""}</p>
      {result.failed.length > 0 && <ul className="text-sm mt-2 space-y-1 text-brick">{result.failed.map((f, i) => <li key={i}>Row <span className="figure">{f.rowNumber}</span>: {f.error}</li>)}</ul>}</Panel>}</>);
}
