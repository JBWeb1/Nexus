"use client";
import { useEffect, useState } from "react"; import { KeyRound, Copy, Check } from "lucide-react";
import { api } from "../api/client"; import { useAuth } from "../context/AuthContext";
import Panel from "./Panel"; import Button from "./Button"; import ErrorNote from "./ErrorNote";

const when = (d?: string) => (d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "Never");
/** API keys for this company. Owners and admins only; a new key is shown once, then only its first characters. */
export default function ApiKeysPanel() {
  const { user } = useAuth(); const [keys, setKeys] = useState<any[] | null>(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", access: "READ" }); const [fresh, setFresh] = useState<{ name: string; key: string } | null>(null); const [copied, setCopied] = useState(false);
  const isAdmin = ["OWNER", "ADMIN"].includes(user?.role || "");
  const load = () => api.get("/api-keys").then((d) => setKeys(d.apiKeys)).catch((e) => setError(e.message));
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);
  if (!isAdmin) return null;
  const run = async (fn: () => Promise<any>) => { setBusy(true); setError(null); try { await fn(); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const create = (e) => { e.preventDefault(); run(async () => { const r = await api.post("/api-keys", f); setFresh({ name: r.apiKey.name, key: r.key }); setCopied(false); setF({ name: "", access: "READ" }); }); };
  const revoke = (k) => { if (confirm(`Revoke "${k.name}"? Anything using this key stops working straight away.`)) run(() => api.delete(`/api-keys/${k.id}`)); };
  const copy = async () => { try { await navigator.clipboard.writeText(fresh!.key); setCopied(true); } catch { /* the key is selectable */ } };
  return (<Panel title="API keys" action={<a href="/developers" target="_blank" className="text-sm font-medium text-primary hover:underline">API documentation</a>}><ErrorNote error={error} />
    <p className="text-sm text-ink-soft mb-4">Let other software, such as your online shop, point of sale or your accountant's tools, use this company's books. Each key works for this company only. Keep keys secret, like a password.</p>
    {fresh && <div className="mb-4 rounded-lg border border-success/40 bg-success/5 p-4 text-sm">
      <div className="font-semibold">Copy your new key for "{fresh.name}" now</div><p className="text-ink-soft mt-1">For your security it is shown only once. If you lose it, revoke it and make a new one.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2"><code className="figure select-all break-all rounded bg-card px-3 py-2 border" data-testid="new-api-key">{fresh.key}</code>
        <Button variant="secondary" onClick={copy}>{copied ? <><Check className="size-4" />Copied</> : <><Copy className="size-4" />Copy</>}</Button><Button variant="ghost" onClick={() => setFresh(null)}>Done</Button></div></div>}
    <form onSubmit={create} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
      <div><label className="label">Name</label><input required maxLength={80} className="field" placeholder="e.g. Online shop" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label">Access</label><select className="field w-auto" value={f.access} onChange={(e) => setF({ ...f, access: e.target.value })}><option value="READ">Read only</option><option value="WRITE">Read and write</option></select></div>
      <Button type="submit" disabled={busy}><KeyRound className="size-4" />Create key</Button></form>
    {keys && keys.length > 0 && <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft"><th className="py-2 pr-3 font-medium">Name</th><th className="pr-3 font-medium">Key</th><th className="pr-3 font-medium">Access</th><th className="pr-3 font-medium">Last used</th><th></th></tr></thead>
      <tbody>{keys.map((k) => <tr key={k.id} className="border-t"><td className="py-2 pr-3"><div className="font-medium">{k.name}</div><div className="text-xs text-ink-soft">by {k.createdByName || "someone"} · {when(k.createdAt)}</div></td>
        <td className="pr-3"><code className="figure text-xs">{k.prefix}…</code></td><td className="pr-3">{k.access === "WRITE" ? "Read and write" : "Read only"}</td>
        <td className="pr-3 text-ink-soft">{k.revokedAt ? <span className="text-destructive">Revoked {when(k.revokedAt)}</span> : when(k.lastUsedAt)}</td>
        <td className="text-right">{!k.revokedAt && <Button variant="secondary" disabled={busy} onClick={() => revoke(k)}>Revoke</Button>}</td></tr>)}</tbody></table></div>}
  </Panel>);
}
