"use client";
import { useState } from "react"; import { Link, useNavigate, useSearchParams } from "@/ui/lib/router"; import { api } from "../api/client";
import AuthShell from "./AuthShell"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";
export default function ResetPassword() {
  const [sp] = useSearchParams(); const nav = useNavigate(); const token = sp.get("token") || ""; const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); if (pw !== pw2) return setError("The two passwords don't match"); setBusy(true); setError(null); try { await api.post("/auth/reset", { token, password: pw }); nav("/login", { replace: true }); } catch (err) { setError(err.message); setBusy(false); } }
  return (<AuthShell title="Choose a new password" footer={<Link className="text-white underline" to="/login">Back to sign in</Link>}>
    {!token ? <p className="text-sm text-foreground">This link is missing its token. Request a new one from the sign-in page.</p> :
      <form onSubmit={submit} className="space-y-4"><ErrorNote error={error} />
        <div><label className="label">New password</label><input type="password" required minLength={8} autoFocus className="field" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div><label className="label">Repeat password</label><input type="password" required minLength={8} className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save password"}</Button></form>}</AuthShell>);
}
