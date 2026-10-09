"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client";
import Panel from "./Panel"; import Button from "./Button"; import ErrorNote from "./ErrorNote";
const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", ACCOUNTANT: "Accountant", VIEWER: "Viewer (read-only)" };
const ROLE_HELP = { ADMIN: "Everything, including managing the team", ACCOUNTANT: "Full bookkeeping, VAT and month-end; cannot manage the team", VIEWER: "Can look but not change anything" };
export default function TeamPanel() {
  const [d, setD] = useState(null); const [error, setError] = useState(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [f, setF] = useState({ email: "", role: "ACCOUNTANT" });
  const load = () => api.get("/team").then(setD).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<any>, ok?: string) => { setBusy(true); setError(null); setMsg(""); try { await fn(); if (ok) setMsg(ok); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const invite = (e) => { e.preventDefault(); run(async () => { const r = await api.post("/team/invite", f); setF({ ...f, email: "" }); setMsg(r.status === "added" ? "Added. They'll see this company in their switcher." : `Invited. When they create an account with that email, this company appears in their switcher.${r.emailed ? " We've emailed them." : ""}`); }); };
  if (!d) return <Panel title="Team and accountant access"><p className="text-sm text-ink-soft">{error || "Loading…"}</p></Panel>;
  return (<Panel title="Team and accountant access"><ErrorNote error={error} />
    <p className="text-sm text-ink-soft mb-4">Give your accountant or bookkeeper their own login. You stay in control: change a role or remove access at any time and it takes effect straight away.</p>
    <table className="w-full text-sm"><tbody>{d.members.map((m) => <tr key={m.id} className="ledger-rule"><td className="py-2"><div>{m.name}{m.you && <span className="text-xs text-ink-soft"> (you)</span>}</div><div className="text-xs text-ink-soft">{m.email}</div></td>
      <td className="text-right">{d.canManage && m.role !== "OWNER" ? <select aria-label={`Role for ${m.name}`} className="field w-auto" value={m.role} disabled={busy} onChange={(e) => run(() => api.patch(`/team/${m.id}`, { role: e.target.value }))}>{["ADMIN", "ACCOUNTANT", "VIEWER"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select> : <span className="text-ink-soft">{ROLE_LABEL[m.role]}</span>}</td>
      <td className="text-right pl-3 w-20">{d.canManage && m.role !== "OWNER" && <button className="text-xs text-brick hover:underline" onClick={() => window.confirm(`Remove ${m.name}'s access to this company?`) && run(() => api.delete(`/team/${m.id}`))}>Remove</button>}</td></tr>)}
      {d.invitations.map((i) => <tr key={i.id} className="ledger-rule"><td className="py-2"><div>{i.email}</div><div className="text-xs text-ink-soft">Invited, waiting for them to create an account</div></td><td className="text-right text-ink-soft">{ROLE_LABEL[i.role]}</td><td className="text-right pl-3">{d.canManage && <button className="text-xs text-brick hover:underline" onClick={() => run(() => api.delete(`/team/invitations/${i.id}`))}>Cancel</button>}</td></tr>)}</tbody></table>
    {d.canManage ? <form onSubmit={invite} className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 items-end"><div className="md:col-span-1"><label className="label">Email</label><input type="email" required className="field" placeholder="accountant@firm.co.za" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div><label className="label">Access</label><select className="field" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{["ACCOUNTANT", "ADMIN", "VIEWER"].map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
      <Button type="submit" disabled={busy}>Invite</Button><p className="md:col-span-3 text-xs text-ink-soft">{ROLE_HELP[f.role]}</p></form> : <p className="mt-4 text-xs text-ink-soft">Only an owner or admin can change who has access.</p>}
    {msg && <p className="text-xs text-success mt-3">{msg}</p>}</Panel>);
}
