"use client";
import { useEffect, useState } from "react";

const R = (n, cur = "ZAR") => `${cur === "ZAR" ? "R" : cur + " "} ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nice = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

/** What a customer sees from their portal link: what they owe, each open invoice (view or pay), and their statement. */
export default function Portal({ token }: { token: string }) {
  const [d, setD] = useState(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(null);
  const base = `/api/portal/${encodeURIComponent(token)}`;
  useEffect(() => { fetch(base).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Something went wrong"); setD(j); }).catch((e) => setError(e.message)); }, [base]);
  async function pay(id) {
    setBusy(id); setError(null);
    try { const r = await fetch(`${base}/invoices/${id}/pay`, { method: "POST" }); const j = await r.json(); if (!r.ok) throw new Error(j.error || "Could not start the payment"); window.location.href = j.url; }
    catch (e) { setError(e.message); setBusy(null); }
  }
  if (!d) return <main className="min-h-screen bg-background grid place-items-center p-6"><p className={error ? "text-brick" : "text-ink-soft"}>{error || "Loading…"}</p></main>;
  const s = d.statement, o = s.organization, late = s.openInvoices.filter((i) => i.daysLate > 0);
  return (<main className="min-h-screen bg-background px-4 py-8"><div className="mx-auto max-w-3xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-ink-soft">Account with</p><h1 className="font-display text-3xl">{o.name}</h1>
      <p className="text-sm text-ink-soft">{[o.phone, o.email].filter(Boolean).join(" · ")}</p></div>
      <div className="sm:text-right"><p className="text-sm text-ink-soft">{s.contact.name} owes</p><p className="font-display text-4xl figure">{R(s.closingBalance, s.currency)}</p>
        {late.length > 0 && <p className="text-sm text-brick">{late.length} invoice{late.length === 1 ? " is" : "s are"} overdue</p>}</div></header>
    {error && <p className="rounded-lg border border-brick/30 bg-brick/5 p-3 text-sm text-brick">{error}</p>}
    <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-display text-xl mb-3">Invoices to pay</h2>
      {s.openInvoices.length === 0 ? <p className="text-sm text-success">Nothing is owing. Thank you!</p> :
      <ul className="divide-y divide-border">{s.openInvoices.map((i) => <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="font-medium figure">{i.number}</p><p className={`text-sm ${i.daysLate ? "text-brick" : "text-ink-soft"}`}>{i.daysLate ? `${i.daysLate} day${i.daysLate === 1 ? "" : "s"} overdue` : `Due ${nice(i.dueDate)}`}</p></div>
        <div className="flex items-center gap-3"><span className="figure font-medium">{R(i.owing, s.currency)}</span>
          <a className="text-sm text-primary hover:underline" href={`${base}/invoices/${i.id}/pdf`} target="_blank" rel="noreferrer">View</a>
          {d.canPayOnline && s.currency === "ZAR" && <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" disabled={!!busy} onClick={() => pay(i.id)}>{busy === i.id ? "Opening…" : "Pay now"}</button>}</div></li>)}</ul>}
      {o.bankDetails && <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm"><p className="font-medium mb-1">Pay by EFT</p><p className="whitespace-pre-line text-ink-soft">{o.bankDetails}</p><p className="mt-1 text-xs text-ink-soft">Use the invoice number as your reference.</p></div>}</section>
    <section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h2 className="font-display text-xl">Statement</h2>
      <a className="text-sm text-primary hover:underline" href={`${base}/statement.pdf`} target="_blank" rel="noreferrer">Download PDF</a></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft border-b border-border"><th className="pb-2 font-normal">Date</th><th className="pb-2 font-normal">Details</th><th className="pb-2 font-normal text-right">Amount</th><th className="pb-2 font-normal text-right">Balance</th></tr></thead>
        <tbody><tr className="border-b border-border text-ink-soft"><td className="py-1.5">{nice(s.from)}</td><td>Balance brought forward</td><td /><td className="text-right figure">{R(s.openingBalance, s.currency)}</td></tr>
          {s.lines.map((l, i) => <tr key={i} className="border-b border-border"><td className="py-1.5 whitespace-nowrap">{nice(l.date)}</td><td>{l.type === "INVOICE" ? `Invoice ${l.reference}` : l.description}</td>
            <td className={`text-right figure ${l.credit ? "text-success" : ""}`}>{l.debit ? R(l.debit, s.currency) : `−${R(l.credit, s.currency)}`}</td><td className="text-right figure">{R(l.balance, s.currency)}</td></tr>)}</tbody></table></div></section>
    <p className="text-center text-xs text-ink-soft">This page is private to {s.contact.name}. Please do not share the link.</p>
  </div></main>);
}
