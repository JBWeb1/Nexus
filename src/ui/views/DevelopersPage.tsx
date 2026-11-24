// The public API map at /developers: how to authenticate, then every endpoint grouped by area, with examples.
import React from "react";
import { ENDPOINTS, type Endpoint } from "@/server/apiSpec";

const METHOD: Record<string, string> = { GET: "bg-emerald-100 text-emerald-800", POST: "bg-blue-100 text-blue-800", PATCH: "bg-amber-100 text-amber-800", PUT: "bg-amber-100 text-amber-800", DELETE: "bg-red-100 text-red-800" };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "-");
function curl(e: Endpoint, base: string) {
  const q = e.query ? "?" + Object.keys(e.query).map((k) => `${k}=…`).join("&") : "";
  const parts = [`curl ${e.method === "GET" ? "" : `-X ${e.method} `}${base}/api${e.path.replace(/\{(\w+)\}/g, (_, n) => `<${n}>`)}${q}`, `  -H "Authorization: Bearer $NEXUS_API_KEY"`];
  if (e.body) parts.push(`  -H "Content-Type: application/json"`, `  -d '${JSON.stringify(e.body, null, 2).replace(/\n/g, "\n  ")}'`);
  return parts.join(" \\\n");
}
const Code = ({ children }: { children: string }) => <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0b1220] p-4 text-[13px] leading-6 text-slate-100"><code>{children}</code></pre>;

export default function DevelopersPage() {
  const base = (process.env.APP_URL || "https://your-nexus-site").replace(/\/$/, "");
  const tags = [...new Set(ENDPOINTS.map((e) => e.tag))];
  return (<div className="min-h-screen bg-slate-50 text-slate-700">
    <header className="bg-[#0b1220]"><div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
      <a href="/login"><img src="/nexus-logo-clear.png" alt="Nexus Ledger" className="h-9" /></a><span className="font-semibold text-white">API</span>
      <nav className="ml-auto flex flex-wrap gap-4 text-sm"><a href="/api/openapi.json" className="text-slate-400 hover:text-white">OpenAPI file</a><a href="/terms" className="text-slate-400 hover:text-white">Terms</a><a href="/privacy" className="text-slate-400 hover:text-white">Privacy</a></nav></div></header>
    <main className="mx-auto grid max-w-5xl gap-10 px-5 py-10 lg:grid-cols-[200px_1fr]">
      <aside className="hidden lg:block"><nav className="sticky top-6 space-y-1 text-sm"><a href="#start" className="block py-1 font-semibold text-slate-900">Getting started</a>{tags.map((t) => <a key={t} href={`#${slug(t)}`} className="block py-1 text-slate-500 hover:text-slate-900">{t}</a>)}<a href="#errors" className="block py-1 text-slate-500 hover:text-slate-900">Errors and limits</a></nav></aside>
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Nexus Ledger API</h1>
        <p className="mt-2 text-[15px] leading-7">Connect your own software to a company's books: create invoices from your online shop, send sales from a point of sale, or pull reports into a spreadsheet. The API speaks JSON over HTTPS. Every endpoint below is listed in the <a className="text-blue-600 underline" href="/api/openapi.json">OpenAPI file</a>, which Postman and code generators can read.</p>
        <section id="start" className="mt-10"><h2 className="text-xl font-bold text-slate-900">Getting started</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-[15px] leading-7"><li>Sign in to Nexus as an owner or admin and open <strong>Settings › API keys</strong>.</li>
            <li>Create a key. Choose <strong>Read only</strong> to fetch data, or <strong>Read and write</strong> to add and change it. Copy the key: it is shown once.</li>
            <li>Send it with every request in the <code>Authorization</code> header. Each key works for one company.</li></ol>
          <Code>{`curl ${base}/api/auth/me \\\n  -H "Authorization: Bearer nxs_your_key_here"`}</Code>
          <p className="mt-3 text-sm leading-6">Keep keys secret: use them only from a server, never in a web page or app that other people can open. Revoke a key in Settings the moment you think it leaked. Read-and-write keys act with an accountant's permissions; no key can manage people, billing, other keys or sign-in.</p></section>
        {tags.map((t) => <section key={t} id={slug(t)} className="mt-12"><h2 className="text-xl font-bold text-slate-900">{t}</h2>
          <div className="mt-4 space-y-4">{ENDPOINTS.filter((e) => e.tag === t).map((e) => <details key={e.method + e.path} className="group rounded-xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-bold ${METHOD[e.method]}`}>{e.method}</span><code className="text-sm font-semibold text-slate-900">{e.path}</code><span className="text-sm text-slate-500">{e.summary}</span>{e.write && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">write key</span>}</summary>
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm leading-6">
              {e.note && <p>{e.note}</p>}
              {e.query && <div className="mt-2"><strong>Query:</strong> {Object.entries(e.query).map(([k, v]) => <span key={k} className="mr-3"><code>{k}</code> {v}</span>)}</div>}
              <p className="mt-2"><strong>Returns:</strong> <code>{e.returns}</code></p>
              <Code>{curl(e, base)}</Code></div></details>)}</div></section>)}
        <section id="errors" className="mt-12"><h2 className="text-xl font-bold text-slate-900">Errors and limits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-7">
            <li>Errors come back as <code>{"{ \"error\": \"…\" }"}</code> with a plain-English message: <code>400</code> something in the request is wrong, <code>401</code> missing or revoked key, <code>403</code> the key may not do this, <code>404</code> not found, <code>409</code> not allowed in this state (for example, editing a sent invoice), <code>429</code> too many requests.</li>
            <li>Each key may make up to 300 requests a minute.</li>
            <li>Posted accounting entries never change. To correct a sent invoice, issue a credit note; to correct a payment, reverse it.</li>
            <li>When a company's free trial or subscription ends, the API stays readable but writes are refused (<code>402</code>).</li>
            <li>Everything a key does appears in the company's activity log, marked with the key's name.</li></ul></section>
      </div></main></div>);
}
