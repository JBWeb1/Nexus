// Public legal pages (Privacy Policy, Terms of Service, Business details). Renders the small markdown in src/legal/content.ts.
import React from "react";
import { missingDetails } from "@/legal/content";

const LINKS = [["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"], ["/legal", "Business details"]];

/** **bold**, [text](url) and [placeholders] (highlighted so unfilled business details stand out). */
function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = []; const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|\[([^\]]+)\]/g; let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={key + i++} className="font-semibold text-slate-900">{m[1]}</strong>);
    else if (m[2]) out.push(<a key={key + i++} href={m[3]} className="font-medium text-blue-600 underline underline-offset-2" {...(m[3].startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>{m[2]}</a>);
    else out.push(<mark key={key + i++} className="rounded bg-amber-100 px-1 text-amber-900 ring-1 ring-amber-300">[{m[4]}]</mark>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last)); return out;
}
function render(md: string) {
  const blocks = md.trim().split(/\n\s*\n/); const out: React.ReactNode[] = [];
  blocks.forEach((b, n) => {
    const lines = b.split("\n");
    if (lines[0].startsWith("## ")) { out.push(<h2 key={n} className="mt-10 mb-3 text-xl font-bold tracking-tight text-slate-900">{inline(lines[0].slice(3), `h${n}`)}</h2>); if (lines.length > 1) out.push(...render(lines.slice(1).join("\n")).map((x, k) => <React.Fragment key={`${n}-${k}`}>{x}</React.Fragment>)); }
    else if (lines.every((l) => l.startsWith("- "))) out.push(<ul key={n} className="my-3 list-disc space-y-2 pl-6">{lines.map((l, k) => <li key={k}>{inline(l.slice(2), `l${n}-${k}`)}</li>)}</ul>);
    else out.push(<p key={n} className="my-3">{inline(lines.join(" "), `p${n}`)}</p>);
  });
  return out;
}
export default function LegalPage({ title, path, md }: { title: string; path: string; md: string }) {
  const missing = missingDetails();
  return (<div className="min-h-screen bg-slate-50 text-slate-700">
    <header className="bg-[#0b1220]"><div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
      <a href="/login" className="flex items-center gap-2"><img src="/nexus-logo-clear.png" alt="Nexus Ledger" className="h-9" /></a>
      <nav className="ml-auto flex flex-wrap gap-4 text-sm">{LINKS.map(([href, label]) => <a key={href} href={href} className={href === path ? "font-semibold text-white" : "text-slate-400 hover:text-white"}>{label}</a>)}</nav></div></header>
    <main className="mx-auto max-w-3xl px-5 py-10">
      {missing.length > 0 && <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Draft.</strong> Some business details are still to be filled in (highlighted below). Complete them in <code>src/legal/business.ts</code> before launch.</div>}
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      <article className="mt-2 text-[15px] leading-7">{render(md)}</article>
      <footer className="mt-14 border-t border-slate-200 pt-6 text-sm text-slate-500"><a href="/login" className="text-blue-600 underline">Back to Nexus Ledger</a></footer>
    </main></div>);
}
