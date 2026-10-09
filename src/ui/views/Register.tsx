"use client";
import { useState } from "react"; import { Link, useNavigate } from "@/ui/lib/router"; import { useAuth } from "../context/AuthContext";
import AuthShell from "./AuthShell"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";
export default function Register() {
  const { register } = useAuth(); const nav = useNavigate(); const [f, setF] = useState({ organizationName: "", name: "", email: "", password: "" }); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setError(null); try { await register(f); try { localStorage.setItem("nexus_tour_pending", "1"); } catch {} window.location.assign("/"); } catch (err) { setError(err.message); setBusy(false); } }
  return (<AuthShell title="Create your books" footer={<>Already registered? <Link className="text-white underline" to="/login">Sign in</Link></>}>
    <form onSubmit={submit} className="space-y-4"><ErrorNote error={error} />
      <div><label className="label">Business name</label><input required className="field" value={f.organizationName} onChange={set("organizationName")} /></div>
      <div><label className="label">Your name</label><input required className="field" value={f.name} onChange={set("name")} /></div>
      <div><label className="label">Email</label><input type="email" required className="field" value={f.email} onChange={set("email")} /></div>
      <div><label className="label">Password (min 8 characters)</label><input type="password" required minLength={8} className="field" value={f.password} onChange={set("password")} /></div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Start free trial"}</Button>
      <p className="text-center text-xs text-muted-foreground">14 days free, no card needed. Then R250 a month, or R470 for multiple companies.</p></form></AuthShell>);
}
