"use client";
import { useEffect, useState } from "react"; import { Link } from "@/ui/lib/router"; import { api } from "../api/client"; import Button from "./Button";
const ROUTE = { INVOICE: "/invoices/", BILL: "/bills/", QUOTE: "/quotes/" };
const when = (s) => new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
export function NoteCard({ n, onChange, showLink = false }: { n: any; onChange: () => void | Promise<void>; showLink?: boolean }) {
  const [edit, setEdit] = useState(false); const [body, setBody] = useState(n.body); const [err, setErr] = useState(null);
  const save = async () => { try { await api.patch(`/notes/${n.id}`, { body }); setEdit(false); onChange(); } catch (e) { setErr(e.message); } };
  const pin = async () => { try { await api.patch(`/notes/${n.id}`, { pinned: !n.pinned }); onChange(); } catch (e) { setErr(e.message); } };
  const del = async () => { if (!window.confirm("Delete this note?")) return; try { await api.delete(`/notes/${n.id}`); onChange(); } catch (e) { setErr(e.message); } };
  return (<div className={`rounded-sm border p-4 ${n.pinned ? "border-gold bg-gold/10" : "border-hairline bg-paper-light"}`}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0">{n.title && <div className="font-medium">{n.title}</div>}
      {showLink && n.entityType !== "GENERAL" && <div className="text-xs text-ink-soft">{n.entityType === "CONTACT" ? "Contact" : n.entityType === "PERIOD" ? "Month" : n.entityType.charAt(0) + n.entityType.slice(1).toLowerCase()}: {ROUTE[n.entityType] ? <Link className="text-primary font-medium hover:underline" to={ROUTE[n.entityType] + n.entityId}>{n.label}</Link> : n.entityType === "CONTACT" ? <Link className="text-primary font-medium hover:underline" to="/contacts">{n.label}</Link> : n.entityType === "PERIOD" ? <Link className="text-primary font-medium hover:underline" to="/month-end">{n.label}</Link> : n.label}</div>}</div>
      <div className="flex gap-3 text-xs shrink-0"><button className="text-ink-soft hover:text-ink" onClick={pin}>{n.pinned ? "Unpin" : "Pin"}</button><button className="text-ink-soft hover:text-ink" onClick={() => { setEdit(!edit); setBody(n.body); }}>Edit</button><button className="text-brick hover:underline" onClick={del}>Delete</button></div></div>
    {edit ? <div className="mt-2 space-y-2"><textarea className="field w-full" rows={3} value={body} onChange={(e) => setBody(e.target.value)} /><div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button></div></div> : <p className="text-sm whitespace-pre-wrap mt-1">{n.body}</p>}
    {err && <p className="text-xs text-brick mt-1">{err}</p>}<div className="text-xs text-ink-soft mt-2">{n.createdByName} · {when(n.updatedAt)}</div></div>);
}
/** Notes attached to one item (invoice, bill, quote or month). */
export default function NotesPanel({ entityType, entityId, title = "Notes" }) {
  const [notes, setNotes] = useState(null); const [body, setBody] = useState(""); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => api.get(`/notes?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`).then((d) => setNotes(d.notes)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [entityType, entityId]);
  const add = async (e) => { e.preventDefault(); if (!body.trim()) return; setBusy(true); setErr(null); try { await api.post("/notes", { entityType, entityId, body }); setBody(""); await load(); } catch (e2) { setErr(e2.message); } finally { setBusy(false); } };
  return (<div className="bg-paper-light border border-hairline rounded-sm"><div className="px-5 py-3 ledger-rule"><h2 className="font-display text-lg">{title}</h2></div><div className="p-5 space-y-3">
    {notes && notes.length === 0 && <p className="text-sm text-ink-soft">No notes yet. Use this for reminders, agreements and anything you want to remember.</p>}
    {(notes || []).map((n) => <NoteCard key={n.id} n={n} onChange={load} />)}
    <form onSubmit={add} className="space-y-2"><textarea className="field w-full" rows={2} placeholder="Add a note…" value={body} onChange={(e) => setBody(e.target.value)} /><div className="flex items-center gap-3"><Button type="submit" disabled={busy || !body.trim()}>{busy ? "Saving…" : "Add note"}</Button>{err && <span className="text-sm text-brick">{err}</span>}</div></form></div></div>);
}
