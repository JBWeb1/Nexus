"use client";
import { useState } from "react"; import { Link } from "@/ui/lib/router"; import { api } from "../api/client";
import AuthShell from "./AuthShell"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";
export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [done, setDone] = useState(false); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); setBusy(true); setError(null); try { await api.post("/auth/forgot", { email }); setDone(true); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return (<AuthShell title="Reset your password" footer={<Link className="text-white underline" to="/login">Back to sign in</Link>}>
    {done ? <p className="text-sm text-foreground">If that email has an account, a reset link is on its way. It works for one hour.</p> :
      <form onSubmit={submit} className="space-y-4"><ErrorNote error={error} /><div><label className="label">Email</label><input type="email" required autoFocus className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></div><Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send reset link"}</Button></form>}</AuthShell>);
}
