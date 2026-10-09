"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import Panel from "../components/Panel";
export default function Activity() {
  const [rows, setRows] = useState(null); const [error, setError] = useState(null);
  useEffect(() => { api.get("/activity").then((d) => setRows(d.activity)).catch((e) => setError(e.message)); }, []);
  return (<div className="space-y-6 max-w-4xl"><div><h1 className="font-display text-3xl">Activity</h1><p className="text-sm text-ink-soft mt-1">Who changed what in this company. Entries can't be edited or removed.</p></div>
    {error && <p className="text-brick text-sm">{error}</p>}
    <Panel>{!rows ? <p className="text-ink-soft text-sm">Loading…</p> : rows.length === 0 ? <p className="text-ink-soft text-sm">Nothing has happened yet.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{rows.map((r) => <tr key={r.id} className="ledger-rule"><td className="py-2 figure text-ink-soft pr-4 align-top">{new Date(r.createdAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</td><td className="pr-4">{r.userName || "System"}</td><td>{r.action}</td></tr>)}</tbody></table></div>}</Panel></div>);
}
