"use client";
import { useEffect, useState } from "react";
import Panel from "./Panel"; import Button from "./Button";

/** Registers the service worker (production only) so browsers offer to install Nexus as an app. */
export function useServiceWorker() {
  useEffect(() => { if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);
}

let deferred = null; const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; listeners.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach((f) => f()); });
}
const platform = () => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios"; if (/Android/.test(ua)) return "android"; return "desktop";
};
const installed = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);

/** Settings > Install the app: one button where the browser supports it, plain steps where it does not (iPhone). */
export default function InstallApp() {
  const [, force] = useState(0); const [msg, setMsg] = useState(null);
  useEffect(() => { const f = () => force((n) => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  const p = platform();
  async function install() { if (!deferred) return; deferred.prompt(); const r = await deferred.userChoice; deferred = null; force((n) => n + 1); setMsg(r.outcome === "accepted" ? "Installing… look for Nexus on your home screen or in your apps." : null); }
  return (<div id="install"><Panel title="Install the app">
    <div className="space-y-3 text-sm">
      {installed() ? <p className="text-success">Nexus is installed on this device. Open it from your home screen, dock or Start menu.</p> : <>
        <p className="text-ink-soft">Put Nexus on your phone's home screen or your computer's dock like any other app: its own icon and window, no app store needed. Your books stay in sync everywhere.</p>
        {deferred ? <Button onClick={install}>Install Nexus</Button>
          : p === "ios" ? <ol className="list-decimal pl-5 space-y-1"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (the square with an arrow).</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>
          : p === "android" ? <p>Open the browser menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>. An Android app (APK) is also available from your administrator.</p>
          : <p>In <b>Chrome</b> or <b>Edge</b>, click the install icon at the right of the address bar, or open the menu and choose <b>Install Nexus Ledger</b>. On a Mac with Safari: <b>File › Add to Dock</b>.</p>}
        {msg && <p className="text-success">{msg}</p>}</>}
    </div></Panel></div>);
}
