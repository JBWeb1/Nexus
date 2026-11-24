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
export type Device = "ios" | "android" | "mac" | "windows" | "other";
export const device = (): Device => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android"; if (/Mac/.test(ua)) return "mac"; if (/Windows/.test(ua)) return "windows"; return "other";
};
const platform = () => { const d = device(); return d === "ios" || d === "android" ? d : "desktop"; };
export const installed = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);
/** The browser's own "Install app" prompt, where it offers one (Chrome and Edge on Android, Windows, Mac, Linux). */
export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  async function install() { if (!deferred) return null; deferred.prompt(); const r = await deferred.userChoice; deferred = null; force((n) => n + 1); return r.outcome as "accepted" | "dismissed"; }
  return { canInstall: !!deferred, install };
}

/** Settings > Install the app: one button where the browser supports it, plain steps where it does not (iPhone). */
export default function InstallApp() {
  const [msg, setMsg] = useState(null); const { canInstall, install: prompt } = useInstallPrompt();
  const p = platform();
  async function install() { const r = await prompt(); setMsg(r === "accepted" ? "Installing… look for Nexus on your home screen or in your apps." : null); }
  return (<div id="install"><Panel title="Install the app">
    <div className="space-y-3 text-sm">
      {installed() ? <p className="text-success">Nexus is installed on this device. Open it from your home screen, dock or Start menu.</p> : <>
        <p className="text-ink-soft">Put Nexus on your phone's home screen or your computer's dock like any other app: its own icon and window, no app store needed. Your books stay in sync everywhere.</p>
        {canInstall ? <Button onClick={install}>Install Nexus</Button>
          : p === "ios" ? <ol className="list-decimal pl-5 space-y-1"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (the square with an arrow).</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>
          : p === "android" ? <p>Open the browser menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>. You can also download the Android app.</p>
          : <p>In <b>Chrome</b> or <b>Edge</b>, click the install icon at the right of the address bar, or open the menu and choose <b>Install Nexus Ledger</b>. On a Mac with Safari: <b>File › Add to Dock</b>.</p>}
        <p><a href="/download" className="text-primary underline">All the ways to get Nexus</a>: Windows, Mac, Android and iPhone, to share with your team or clients.</p>
        {msg && <p className="text-success">{msg}</p>}</>}
    </div></Panel></div>);
}
