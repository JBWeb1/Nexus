"use client";
import { useState } from "react"; import { Link, useNavigate } from "@/ui/lib/router"; import { useAuth } from "../context/AuthContext";
import AuthShell from "./AuthShell"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";
export default function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [code, setCode] = useState(""); const [need2fa, setNeed2fa] = useState(false); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); setBusy(true); setError(null); try { const r = await login(email, password, need2fa ? code : undefined); if (r?.needs2fa) { setNeed2fa(true); setBusy(false); return; } window.location.assign("/"); } catch (err) { setError(err.message); setBusy(false); } }
  return (<AuthShell title="Sign in" footer={<>New here? <Link className="text-white underline" to="/register">Create an account</Link></>}>
    <form onSubmit={submit} className="space-y-4"><ErrorNote error={error} />
      {!need2fa ? <>
        <div><label className="label">Email</label><input type="email" required autoFocus className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label><input type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="text-right"><Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot your password?</Link></div></> :
        <div><label className="label">Authenticator code</label><input inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={6} pattern="[0-9]{6}" className="field figure tracking-widest" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /><p className="text-xs text-muted-foreground mt-1">Open your authenticator app and enter the 6-digit code.</p></div>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : need2fa ? "Verify" : "Sign in"}</Button></form></AuthShell>);
}
