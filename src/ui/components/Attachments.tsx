"use client";
import { SkeletonRows } from "./ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { api } from "../api/client";
import { downloadFile } from "../api/download";
import Panel from "./Panel";
import Button from "./Button";
import ErrorNote from "./ErrorNote";

type Attachment = { id: string; filename: string; contentType: string; size: number; uploadedByName: string; createdAt: string };
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Files attached to a document: receipts, signed quotes, supplier invoices. Stored in S3 or Cloudflare R2. */
export default function Attachments({ entityType, entityId }: { entityType: "INVOICE" | "BILL" | "QUOTE" | "CONTACT" | "GENERAL"; entityId?: string }) {
  const [rows, setRows] = useState<Attachment[] | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const input = useRef<HTMLInputElement>(null);
  const load = () => api.get(`/attachments?entityType=${entityType}${entityId ? `&entityId=${entityId}` : ""}`).then((d) => setRows(d.attachments)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [entityType, entityId]);
  async function upload(file?: File) {
    if (!file) return; setBusy(true); setError(null);
    try { const fd = new FormData(); fd.append("file", file); fd.append("entityType", entityType); if (entityId) fd.append("entityId", entityId); await api.upload("/attachments", fd); await load(); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function open(a: Attachment) {
    setError(null);
    try { const res = await fetch(`/api/attachments/${a.id}/download`, { credentials: "same-origin" }); if ((res.headers.get("content-type") || "").includes("application/json")) { const d = await res.json(); if (!res.ok) throw new Error(d.error); window.open(d.url, "_blank", "noopener"); } else await downloadFile(`/attachments/${a.id}/download`, a.filename); }
    catch (e: any) { setError(e.message || "Could not open that file"); }
  }
  async function remove(a: Attachment) { if (!window.confirm(`Delete ${a.filename}?`)) return; try { await api.delete(`/attachments/${a.id}`); await load(); } catch (e: any) { setError(e.message); } }
  return (<Panel title="Files" action={<><input ref={input} type="file" className="sr-only" aria-label="Attach a file" accept=".pdf,image/*,.csv,.txt,.xlsx,.xls,.docx,.doc" onChange={(e) => upload(e.target.files?.[0])} /><Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}><Upload />{busy ? "Uploading…" : "Attach a file"}</Button></>}>
    <ErrorNote error={error} />
    {!rows ? <SkeletonRows rows={4} /> : rows.length === 0 ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Paperclip className="size-4" />Nothing attached yet. Add the receipt, signed quote or supplier invoice so it stays with this document. Up to 10 MB each.</p> :
      <ul className="divide-y">{rows.map((a) => <li key={a.id} className="flex items-center gap-3 py-2.5"><FileText className="size-5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{a.filename}</div><div className="text-xs text-muted-foreground">{size(a.size)}, added by {a.uploadedByName}</div></div>
        <button className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Download ${a.filename}`} onClick={() => open(a)}><Download className="size-4" /></button>
        <button className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Delete ${a.filename}`} onClick={() => remove(a)}><Trash2 className="size-4" /></button></li>)}</ul>}
  </Panel>);
}
