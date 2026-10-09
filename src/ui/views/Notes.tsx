"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client";
import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote"; import { NoteCard } from "../components/Notes";
const FILTERS = [["", "All"], ["GENERAL", "General"], ["INVOICE", "Invoices"], ["BILL", "Bills"], ["QUOTE", "Quotes"], ["CONTACT", "Contacts"], ["PERIOD", "Months"]];
const LIST = { INVOICE: ["/invoices", "invoices", (x) => `${x.number} — ${x.contactName || x.customerName || ""}`], BILL: ["/bills", "bills", (x) => `${x.number} — ${x.contactName || x.supplierName || ""}`], QUOTE: ["/quotes", "quotes", (x) => `${x.number} — ${x.contactName || x.customerName || ""}`], CONTACT: ["/contacts", "contacts", (x) => x.name] };
export default function Notes() {
  const [notes, setNotes] = useState(null); const [filter, setFilter] = useState(""); const [q, setQ] = useState(""); const [error, setError] = useState(null);
  const [f, setF] = useState({ entityType: "GENERAL", entityId: "", title: "", body: "" }); const [targets, setTargets] = useState([]); const [busy, setBusy] = useState(false);
  const load = () => api.get(`/notes?${filter ? `entityType=${filter}&` : ""}${q ? `q=${encodeURIComponent(q)}` : ""}`).then((d) => setNotes(d.notes)).catch((e) => setError(e.message));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [filter, q]);
  useEffect(() => { setF((x) => ({ ...x, entityId: "" })); setTargets([]); const l = LIST[f.entityType]; if (l) api.get(l[0]).then((d) => setTargets(d[l[1]] || [])).catch(() => {}); }, [f.entityType]);
  async function add(e) { e.preventDefault(); setBusy(true); setError(null); try { await api.post("/notes", { entityType: f.entityType, entityId: f.entityType === "GENERAL" ? undefined : f.entityId, title: f.title || undefined, body: f.body }); setF({ ...f, title: "", body: "" }); load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return (<div className="space-y-6 max-w-3xl"><h1 className="font-display text-3xl">Notes</h1><ErrorNote error={error} />
    <Panel title="Add a note"><form onSubmit={add} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="label">About</label><select className="field" value={f.entityType} onChange={(e) => setF({ ...f, entityType: e.target.value })}><option value="GENERAL">This company (general)</option><option value="INVOICE">An invoice</option><option value="BILL">A bill</option><option value="QUOTE">A quote</option><option value="CONTACT">A customer / supplier</option><option value="PERIOD">A month</option></select></div>
        {f.entityType === "PERIOD" ? <div><label className="label">Month</label><input type="month" required className="field figure" value={f.entityId} onChange={(e) => setF({ ...f, entityId: e.target.value })} /></div>
          : f.entityType !== "GENERAL" && <div><label className="label">Which one</label><select required className="field" value={f.entityId} onChange={(e) => setF({ ...f, entityId: e.target.value })}><option value="">Select…</option>{targets.map((t) => <option key={t.id} value={t.id}>{LIST[f.entityType][2](t)}</option>)}</select></div>}</div>
      <div><label className="label">Title (optional)</label><input className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div><label className="label">Note</label><textarea required className="field w-full" rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save note"}</Button></form></Panel>
    <div className="flex flex-wrap items-center gap-2">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`chip ${filter === k ? "chip-on" : ""}`}>{l}</button>)}
      <input className="field !w-56 ml-auto" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <div className="space-y-3">{notes && notes.length === 0 && <p className="text-sm text-ink-soft">No notes yet.</p>}{(notes || []).map((n) => <NoteCard key={n.id} n={n} onChange={load} showLink />)}</div></div>);
}
