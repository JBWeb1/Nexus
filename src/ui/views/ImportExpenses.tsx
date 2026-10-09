"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client";
import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";
export default function ImportExpenses() {
  const [banks, setBanks] = useState([]); const [accounts, setAccounts] = useState([]); const [bankId, setBankId] = useState(""); const [rows, setRows] = useState(null); const [result, setResult] = useState(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { Promise.all([api.get("/bank-accounts"), api.get("/accounts")]).then(([b, a]) => { setBanks(b.bankAccounts); setBankId(b.bankAccounts[0]?.id || ""); setAccounts(a.accounts.filter((x) => x.type === "EXPENSE" && x.isActive)); }).catch((e) => setError(e.message)); }, []);
  async function upload(e) {
    const file = e.target.files[0]; if (!file) return; setBusy(true); setError(null); setResult(null);
    try { const fd = new FormData(); fd.append("file", file);
      const d = await api.upload("/import/expenses/preview", fd);
      const def = accounts.find((a) => a.code === "6900")?.id || ""; setRows(d.rows.map((r) => ({ ...r, accountId: def, include: r.valid })));
    } catch (err) { setError(err.message); setRows(null); } finally { setBusy(false); e.target.value = ""; }
  }
  const edit = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  async function commit() {
    setBusy(true); setError(null);
    try { const d = await api.post("/import/expenses/commit", { bankAccountId: bankId, rows: rows.filter((r) => r.include).map((r) => ({ rowNumber: r.rowNumber, date: r.date, description: r.description, amount: Number(r.amount), accountId: r.accountId })) }); setResult(d); setRows(null); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (<div className="space-y-6 max-w-5xl"><h1 className="font-display text-3xl">Import expenses</h1><ErrorNote error={error} />
    <Panel title="1. Upload a spreadsheet"><p className="text-sm text-ink-soft mb-3">Excel (.xlsx) or CSV with a header row. Columns named Date, Description/Details and Amount are detected automatically. SA dates (dd/mm/yyyy) and amounts like “R 1 250,00” are understood.</p>
      <input type="file" accept=".xlsx,.csv" onChange={upload} disabled={busy} className="text-sm" /></Panel>
    {rows && <Panel title="2. Review and map" action={<div className="flex items-center gap-3"><select className="field !w-auto" value={bankId} onChange={(e) => setBankId(e.target.value)}>{banks.map((b) => <option key={b.id} value={b.id}>Paid from: {b.name}</option>)}</select><Button disabled={busy || !bankId || !rows.some((r) => r.include)} onClick={commit}>{busy ? "Importing…" : `Import ${rows.filter((r) => r.include).length} rows`}</Button></div>}>
      {banks.length === 0 && <p className="text-sm text-brick mb-3">Add a bank account under Banking first.</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal w-8" /><th className="pb-2 font-normal">Row</th><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">Description</th><th className="pb-2 font-normal">Amount</th><th className="pb-2 font-normal">Expense account</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className={`ledger-rule ${r.valid ? "" : "bg-brick/5"}`}><td><input type="checkbox" checked={r.include} disabled={!r.valid} onChange={(e) => edit(i, "include", e.target.checked)} /></td><td className="figure text-ink-soft">{r.rowNumber}</td>
          <td><input type="date" className="field figure !py-1" value={r.date || ""} onChange={(e) => edit(i, "date", e.target.value)} /></td><td><input className="field !py-1" value={r.description} onChange={(e) => edit(i, "description", e.target.value)} /></td>
          <td><input type="number" step="0.01" className="field figure !py-1 w-28" value={r.amount ?? ""} onChange={(e) => edit(i, "amount", e.target.value)} /></td>
          <td><select className="field !py-1" value={r.accountId} onChange={(e) => edit(i, "accountId", e.target.value)}><option value="">Select…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></td></tr>)}</tbody></table></div>
      {rows.some((r) => !r.valid) && <p className="text-xs text-brick mt-3">Highlighted rows are missing a valid date or amount. Fix them to include them.</p>}</Panel>}
    {result && <Panel title="Import result"><p className="text-sm text-success">Imported {result.imported} expense{result.imported === 1 ? "" : "s"}.</p>
      {result.failed.length > 0 && <div className="mt-3"><p className="text-sm text-brick">{result.failed.length} row(s) were skipped (the rest were imported):</p><ul className="text-sm mt-1 space-y-1">{result.failed.map((f, i) => <li key={i}>Row <span className="figure">{f.rowNumber}</span>: {f.error}</li>)}</ul></div>}</Panel>}</div>);
}
