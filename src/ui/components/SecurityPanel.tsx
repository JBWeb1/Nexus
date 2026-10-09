"use client";
import { useState } from "react"; import { api } from "../api/client"; import { downloadFile } from "../api/download"; import { useAuth } from "../context/AuthContext";
import Panel from "./Panel"; import Button from "./Button"; import ErrorNote from "./ErrorNote";
export default function SecurityPanel() {
  const { user, refreshOrg } = useAuth(); const [setup, setSetup] = useState(null); const [code, setCode] = useState(""); const [pw, setPw] = useState(""); const [mode, setMode] = useState(""); const [error, setError] = useState(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const on = !!user?.twoFactorEnabled; const isAdmin = ["OWNER", "ADMIN"].includes(user?.role);
  const run = async (fn) => { setBusy(true); setError(null); setMsg(""); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const start = () => run(async () => { setSetup(await api.post("/auth/2fa/setup")); setCode(""); });
  const enable = (e) => { e.preventDefault(); run(async () => { await api.post("/auth/2fa/enable", { code }); setSetup(null); setCode(""); await refreshOrg(); setMsg("Two-factor sign-in is on."); }); };
  const disable = (e) => { e.preventDefault(); run(async () => { await api.post("/auth/2fa/disable", { code, password: pw }); setMode(""); setCode(""); setPw(""); await refreshOrg(); setMsg("Two-factor sign-in is off."); }); };
  return (<Panel title="Security and your data"><ErrorNote error={error} />
    <div className="space-y-5 text-sm">
      <div><div className="font-medium">Two-factor sign-in {on ? <span className="text-success">· on</span> : <span className="text-ink-soft">· off</span>}</div>
        <p className="text-ink-soft mt-1">Ask for a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password) every time you sign in.</p>
        {!on && !setup && <Button className="mt-2" variant="secondary" disabled={busy} onClick={start}>Set up two-factor</Button>}
        {setup && <form onSubmit={enable} className="mt-3 space-y-3"><img src={setup.qr} alt="Scan this QR code with your authenticator app" width={180} height={180} />
          <p className="text-xs text-ink-soft">Can't scan? Enter this key: <span className="figure select-all">{setup.secret}</span></p>
          <div className="flex items-end gap-3"><div><label className="label">Code from the app</label><input required inputMode="numeric" maxLength={6} pattern="[0-9]{6}" className="field figure w-32" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div><Button type="submit" disabled={busy}>Turn on</Button><button type="button" className="text-xs underline text-ink-soft" onClick={() => setSetup(null)}>Cancel</button></div></form>}
        {on && mode !== "off" && <Button className="mt-2" variant="secondary" onClick={() => setMode("off")}>Turn off</Button>}
        {on && mode === "off" && <form onSubmit={disable} className="mt-3 flex flex-wrap items-end gap-3"><div><label className="label">Current code</label><input required inputMode="numeric" maxLength={6} className="field figure w-32" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div><div><label className="label">Password</label><input type="password" required className="field" value={pw} onChange={(e) => setPw(e.target.value)} /></div><Button type="submit" variant="danger" disabled={busy}>Turn off</Button><button type="button" className="text-xs underline text-ink-soft" onClick={() => setMode("")}>Cancel</button></form>}
        {msg && <p className="text-xs text-success mt-2">{msg}</p>}</div>
      {isAdmin && <div className="pt-4 ledger-rule"><div className="font-medium">Download all company data</div><p className="text-ink-soft mt-1">Everything in this company as one JSON file. Your data is yours; this is also your POPIA export.</p>
        <Button className="mt-2" variant="secondary" onClick={() => downloadFile("/export/company-data", "company-data.json").catch((e) => setError(e.message))}>Download data</Button></div>}
    </div></Panel>);
}
