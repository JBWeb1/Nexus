"use client";
// Passkeys and security keys: sign in with a fingerprint, face, Windows Hello, a phone or a YubiKey instead of a password.
import { useEffect, useState } from "react"; import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { api } from "../api/client"; import Button from "./Button";

type Passkey = { id: string; name: string; createdAt: string; lastUsedAt: string | null };
const when = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "never");
function guessName() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  return /iPhone|iPad/.test(ua) ? "iPhone or iPad" : /Android/.test(ua) ? "Android phone" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows Hello" : "This device";
}
export default function PasskeysSection({ onError }: { onError: (m: string | null) => void }) {
  const [keys, setKeys] = useState<Passkey[] | null>(null); const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const supported = typeof window !== "undefined" && browserSupportsWebAuthn();
  const load = () => api.get("/auth/passkeys").then((d) => setKeys(d.passkeys)).catch((e) => onError(e.message));
  useEffect(() => { load(); }, []);
  async function add(e) {
    e.preventDefault(); setBusy(true); onError(null); setMsg("");
    try {
      const { options, challengeId } = await api.post("/auth/passkeys/options");
      const response = await startRegistration(options);
      await api.post("/auth/passkeys", { challengeId, response, name: name.trim() || guessName() });
      setName(""); setMsg("Passkey added. Next time, choose “Sign in with a passkey”."); await load();
    } catch (err) { onError(err?.name === "NotAllowedError" ? "Adding the passkey was cancelled." : err?.name === "InvalidStateError" ? "This device already has a passkey for your account." : err.message); }
    finally { setBusy(false); }
  }
  async function remove(k: Passkey) {
    if (!window.confirm(`Remove “${k.name}”? You will not be able to sign in with it any more.`)) return;
    try { await api.delete(`/auth/passkeys/${k.id}`); await load(); } catch (e) { onError(e.message); }
  }
  return (<div className="pt-4 ledger-rule"><div className="font-medium">Passkeys and security keys {keys?.length ? <span className="text-success">· {keys.length} added</span> : null}</div>
    <p className="text-ink-soft mt-1">Sign in with your fingerprint, face, phone or a security key such as a YubiKey. No password to type or steal, and it counts as two-factor on its own.</p>
    {!supported ? <p className="mt-2 text-xs text-ink-soft">This browser cannot use passkeys. Try a recent Chrome, Edge, Safari or Firefox.</p> :
      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-3"><div><label className="label">Name (optional)</label><input className="field" maxLength={60} placeholder={guessName()} value={name} onChange={(e) => setName(e.target.value)} /></div><Button type="submit" variant="secondary" disabled={busy} data-testid="add-passkey">{busy ? "Waiting for your device…" : "Add a passkey"}</Button></form>}
    {msg && <p className="text-xs text-success mt-2">{msg}</p>}
    {!!keys?.length && <ul className="mt-3 divide-y divide-border rounded-md border border-border">{keys.map((k) => <li key={k.id} className="flex items-center gap-3 px-3 py-2"><div className="min-w-0 flex-1"><div className="font-medium truncate">{k.name}</div><div className="text-xs text-ink-soft">Added {when(k.createdAt)} · last used {when(k.lastUsedAt)}</div></div><Button variant="ghost" onClick={() => remove(k)}>Remove</Button></li>)}</ul>}
  </div>);
}
