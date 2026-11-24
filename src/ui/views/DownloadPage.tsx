"use client";
// /download: install Nexus on any phone or computer. The visitor's own device comes first, with a one-click install
// where the browser offers one, and the Windows, Mac and Android files when they have been published.
import { useEffect, useState } from "react";
import { Monitor, Apple, Smartphone, Tablet, Download, CheckCircle2, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { device, installed, useInstallPrompt, type Device } from "../components/InstallApp";
import type { AppFile } from "@/server/services/appDownloads";

type Kind = "windows" | "mac" | "android" | "ios";
const ORDER: Kind[] = ["windows", "mac", "android", "ios"];
const TITLE: Record<Kind, string> = { windows: "Windows PC", mac: "Mac", android: "Android phone or tablet", ios: "iPhone or iPad" };
const ICON: Record<Kind, any> = { windows: Monitor, mac: Apple, android: Smartphone, ios: Tablet };
const when = (d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

function Steps({ items }: { items: React.ReactNode[] }) {
  return <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-slate-600">{items.map((x, i) => <li key={i}>{x}</li>)}</ol>;
}
function FileButton({ f, label }: { f: AppFile; label: string }) {
  return <a href={f.url} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700" data-testid={`download-${f.kind}`}>
    <Download className="h-4 w-4" />{label}<span className="font-normal text-blue-100">· {f.sizeMb} MB</span></a>;
}

function Card({ kind, file, mine, canInstall, onInstall }: { kind: Kind; file?: AppFile; mine: boolean; canInstall: boolean; onInstall: () => void }) {
  const Icon = ICON[kind];
  const browserInstall = mine && canInstall && kind !== "ios"
    ? <button onClick={onInstall} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50" data-testid="install-browser"><Download className="h-4 w-4" />Install from this browser</button> : null;
  const body: Record<Kind, React.ReactNode> = {
    windows: <>
      <div className="mt-4 flex flex-wrap gap-3">{file && <FileButton f={file} label="Download for Windows" />}{browserInstall}</div>
      {file ? <Steps items={[<>Open <b>Nexus-Ledger-Setup.exe</b> from your Downloads.</>, <>If Windows says “Windows protected your PC”, click <b>More info</b> › <b>Run anyway</b>.</>, <>Nexus appears on your desktop and in the Start menu.</>]} />
        : <Steps items={[<>Open this page in <b>Microsoft Edge</b> or <b>Chrome</b>.</>, <>Click the install icon at the right of the address bar (or the menu › <b>Apps</b> › <b>Install Nexus Ledger</b>).</>, <>Nexus gets its own window and a Start menu icon.</>]} />}</>,
    mac: <>
      <div className="mt-4 flex flex-wrap gap-3">{file && <FileButton f={file} label="Download for Mac" />}{browserInstall}</div>
      {file ? <Steps items={[<>Open <b>Nexus-Ledger-Mac.dmg</b> and drag Nexus Ledger into <b>Applications</b>.</>, <>The first time, open it from Applications. If the Mac says it cannot check the app, go to <b>System Settings</b> › <b>Privacy &amp; Security</b> and click <b>Open Anyway</b>.</>]} />
        : <Steps items={[<>In <b>Safari</b>: <b>File</b> › <b>Add to Dock</b>.</>, <>Or in <b>Chrome</b>: the install icon in the address bar.</>]} />}</>,
    android: <>
      <div className="mt-4 flex flex-wrap gap-3">{browserInstall}{file && <FileButton f={file} label="Download the Android app" />}</div>
      <Steps items={[<>Easiest: open this page in <b>Chrome</b>, tap the menu <b>⋮</b> › <b>Install app</b> (or <b>Add to Home screen</b>).</>,
        ...(file ? [<>Or download the app file (APK), open it, and allow your browser to install apps when Android asks.</>] : [])]} /></>,
    ios: <Steps items={[<>Open this page in <b>Safari</b>.</>, <>Tap <b>Share</b> (the square with an arrow).</>, <>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</>]} />,
  };
  return (<section className={`rounded-2xl border bg-white p-6 ${mine ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"}`} data-testid={`card-${kind}`}>
    <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></span>
      <h2 className="text-lg font-bold text-slate-900">{TITLE[kind]}</h2>{mine && <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">This device</span>}</div>
    {body[kind]}
    {file && <p className="mt-3 text-xs text-slate-400">Updated {when(file.updatedAt)}</p>}
  </section>);
}

export default function DownloadPage({ files }: { files: AppFile[] }) {
  const [d, setD] = useState<Device>("other"); const [done, setDone] = useState(false); const [msg, setMsg] = useState("");
  const { canInstall, install } = useInstallPrompt();
  useEffect(() => { setD(device()); setDone(installed()); }, []);
  const mine: Kind | null = d === "other" ? null : d;
  const cards = mine ? [mine, ...ORDER.filter((k) => k !== mine)] : ORDER;
  const fileFor = (k: Kind) => files.find((f) => f.kind === k);
  async function go() { const r = await install(); if (r === "accepted") setMsg("Installing… look for Nexus on your home screen, desktop or in your apps."); }
  return (<div className="min-h-screen bg-slate-50 text-slate-700">
    <header className="bg-[#0b1220]"><div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
      <a href="/login"><img src="/nexus-logo-clear.png" alt="Nexus Ledger" className="h-9" /></a>
      <nav className="ml-auto flex flex-wrap gap-4 text-sm"><a href="/login" className="text-slate-300 hover:text-white">Sign in</a><a href="/register" className="text-slate-300 hover:text-white">Create an account</a></nav></div></header>
    <div className="bg-[#0b1220] pb-16 pt-8 text-center"><div className="mx-auto max-w-2xl px-5">
      <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Nexus on every device</h1>
      <p className="mt-3 text-[15px] leading-7 text-slate-300">Install Nexus Ledger on your phone, tablet or computer. It opens like any other app, with its own icon and window, and your books stay in sync everywhere.</p>
      {done ? <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300"><CheckCircle2 className="h-4 w-4" />Nexus is already installed on this device.</p>
        : canInstall ? <button onClick={go} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-500" data-testid="install-hero"><Download className="h-5 w-5" />Install Nexus on this {d === "android" || d === "ios" ? "phone" : "computer"}</button>
        : mine && fileFor(mine) && mine !== "ios" ? <a href={fileFor(mine)!.url} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-500"><Download className="h-5 w-5" />Download for {TITLE[mine]}</a>
        : mine === "ios" ? <p className="mt-6 text-sm text-slate-300">On iPhone and iPad: open this page in Safari, tap <b className="text-white">Share</b>, then <b className="text-white">Add to Home Screen</b>.</p> : null}
      {msg && <p className="mt-3 text-sm text-emerald-300">{msg}</p>}
    </div></div>
    <main className="mx-auto -mt-8 max-w-5xl px-5 pb-16">
      <div className="grid gap-5 md:grid-cols-2">{cards.map((k) => <Card key={k} kind={k} file={fileFor(k)} mine={k === mine} canInstall={canInstall} onInstall={go} />)}</div>
      <div className="mt-10 grid gap-5 text-sm leading-6 sm:grid-cols-3">
        <div className="flex gap-3"><RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><p><b className="text-slate-900">Always up to date.</b> Every app opens the live Nexus site, so new features arrive without reinstalling.</p></div>
        <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><p><b className="text-slate-900">Nothing kept on the device.</b> Your books stay on the server. Losing a phone does not lose your data.</p></div>
        <div className="flex gap-3"><WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><p><b className="text-slate-900">Needs the internet.</b> Without a connection the app says so and reconnects by itself.</p></div>
      </div>
      <p className="mt-10 text-center text-xs text-slate-400"><a href="/privacy" className="hover:text-slate-600">Privacy</a> · <a href="/terms" className="hover:text-slate-600">Terms</a> · <a href="/developers" className="hover:text-slate-600">API</a></p>
    </main></div>);
}
