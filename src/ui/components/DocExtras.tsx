"use client";
import { useState } from "react"; import { api } from "../api/client"; import { downloadFile } from "../api/download"; import Button from "./Button";
export default function DocExtras({ path, doc, payLink, onError }) {
  const [busy, setBusy] = useState(""); const [msg, setMsg] = useState(""); const [link, setLink] = useState("");
  const run = async (key, fn) => { setBusy(key); setMsg(""); onError(null); try { await fn(); } catch (e) { onError(e.message); } finally { setBusy(""); } };
  return (<>
    <Button variant="secondary" disabled={!!busy} onClick={() => run("pdf", () => downloadFile(`${path}/${doc.id}/pdf`, `${doc.number}.pdf`))}>{busy === "pdf" ? "…" : "Download PDF"}</Button>
    <Button variant="secondary" disabled={!!busy} onClick={() => run("mail", async () => { const d = await api.post(`${path}/${doc.id}/email`); setMsg(`Sent to ${d.sentTo}`); })}>{busy === "mail" ? "Sending…" : "Email"}</Button>
    {payLink && <Button variant="secondary" disabled={!!busy} onClick={() => run("pay", async () => { const d = await api.post(`${path}/${doc.id}/pay-link`); setLink(d.url); try { await navigator.clipboard.writeText(d.url); setMsg("Pay link copied"); } catch { setMsg("Pay link ready"); } })}>{busy === "pay" ? "…" : "Pay link"}</Button>}
    {msg && <span className="text-xs text-ink-soft self-center">{msg}{link && <> · <a className="underline" href={link} target="_blank" rel="noreferrer">open</a></>}</span>}
  </>);
}
