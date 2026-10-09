"use client";
import { useEffect, useState } from "react"; import { useSearchParams } from "@/ui/lib/router"; import { Check, CreditCard, ShieldCheck } from "lucide-react"; import { api } from "../api/client"; import { useAuth } from "../context/AuthContext";
import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote"; import Money from "../components/Money"; import { Badge } from "../components/ui/badge"; import { Skeleton } from "../components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "../components/ui/dialog";
const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : "";
const INCLUDED = ["Invoices, quotes, bills and credit notes", "Bank reconciliation and bank rules", "VAT201 preview and month-end close", "Reports, Excel export and PDF documents", "Your accountant and team, at no extra cost", "Your data stays yours: export everything, any time"];
export default function Billing() {
  const { org, refreshOrg } = useAuth(); const [d, setD] = useState(null); const [error, setError] = useState(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [confirm, setConfirm] = useState(false); const [sp, setSp] = useSearchParams();
  const load = () => api.get("/billing").then(setD).catch((e) => setError(e.message));
  useEffect(() => {
    const ref = sp.get("reference") || sp.get("trxref");
    (async () => {
      if (ref) { setBusy(true); try { await api.post("/billing/verify", { reference: ref }); setMsg("Payment received. Thank you, you're all set."); await refreshOrg(); } catch (e) { setError(e.message); } finally { setBusy(false); setSp({}, { replace: true }); } }
      load();
    })();
  }, []);
  const subscribe = async (plan) => { setBusy(true); setError(null); try { const r = await api.post("/billing/checkout", { plan }); window.location.assign(r.url); } catch (e) { setError(e.message); setBusy(false); } };
  const cancel = async () => { setBusy(true); setError(null); try { await api.post("/billing/cancel"); setConfirm(false); setMsg("Subscription cancelled. You keep full access until the end of the month you've paid for."); await load(); await refreshOrg(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  if (!d) return <div className="max-w-3xl space-y-6"><Skeleton className="h-9 w-40" /><Skeleton className="h-56" /></div>;
  const S = { TRIALING: ["info", "Free trial"], ACTIVE: ["success", "Active"], PAST_DUE: ["warning", "Payment failed"], EXPIRED: ["danger", "Trial ended"], CANCELLED: ["neutral", "Cancelled"], COVERED: ["success", "Covered"] }[d.cancelled && d.entitled ? "CANCELLED" : d.status];
  const paid = ["ACTIVE", "PAST_DUE"].includes(d.status) && !d.cancelled; const PLANS = { SINGLE: { name: "One company", blurb: `Everything in Nexus for ${org?.name || "this company"}.` }, MULTI: { name: "Multiple companies", blurb: "One price covers every company you own, however many you add." } };
  const headline = d.status === "COVERED" ? "Covered by your multi-company plan" : d.status === "TRIALING" ? `${d.daysLeft} ${d.daysLeft === 1 ? "day" : "days"} left in your free trial` : d.status === "EXPIRED" ? "Your free trial has ended" : d.cancelled ? `Access until ${fmt(d.endsAt)}` : d.status === "PAST_DUE" ? "We couldn't take your last payment" : `Renews on ${fmt(d.currentPeriodEnd)}`;
  const sub = d.status === "COVERED" ? `Paid for on ${d.coveredBy?.name}. Nothing more to pay for this company.` : d.status === "TRIALING" ? `Trial ends ${fmt(d.trialEndsAt)}. Nothing is charged until you subscribe.` : d.status === "EXPIRED" ? "Your books are read-only. You can still view and export everything." : d.cancelled ? "No further payments will be taken." : d.status === "PAST_DUE" ? `Update your card by ${fmt(d.endsAt)} to keep editing.` : "Billed monthly through Paystack.";
  const showSubscribe = d.canManage && (d.status === "TRIALING" || d.status === "EXPIRED" || d.cancelled || d.status === "PAST_DUE"); const showCancel = d.isOwner && !d.cancelled && (d.status === "ACTIVE" || d.status === "PAST_DUE");
  return (<div className="max-w-3xl space-y-6"><div><h1 className="text-3xl">Billing</h1><p className="mt-1 text-sm text-muted-foreground">R250 a month for one company, or R470 a month to run the books for all your companies.</p></div>
    <ErrorNote error={error} />{msg && <div role="status" className="flex items-center gap-2 rounded-md border border-success/25 bg-success-soft px-3 py-2.5 text-sm text-success"><Check className="size-4" />{msg}</div>}
    <Panel><Badge variant={S[0]}>{S[1]}</Badge><h2 className="mt-3 text-xl font-bold">{headline}</h2><p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      {d.status !== "COVERED" && <div className="mt-6 grid gap-4 sm:grid-cols-2">{d.plans.map((pl) => { const mine = paid && d.plan === pl.key; const suggest = !paid && (d.ownedCompanies > 1 ? pl.key === "MULTI" : pl.key === "SINGLE"); return (
        <div key={pl.key} className={`flex flex-col rounded-lg border p-5 ${mine ? "border-success bg-success-soft/50" : suggest ? "border-primary ring-1 ring-primary/30" : ""}`}>
          <div className="flex items-center justify-between gap-2"><span className="font-semibold">{PLANS[pl.key].name}</span>{mine ? <Badge variant="success">Your plan</Badge> : suggest && <Badge variant="info">{d.ownedCompanies > 1 ? `Fits your ${d.ownedCompanies} companies` : "Fits you now"}</Badge>}</div>
          <div className="mt-3"><span className="text-4xl font-extrabold tracking-tight">R{pl.price}</span><span className="text-sm text-muted-foreground"> a month</span></div><p className="mt-2 flex-1 text-sm text-muted-foreground">{PLANS[pl.key].blurb}</p>
          {d.canManage && !mine && <Button className="mt-4" variant={suggest ? "primary" : "secondary"} onClick={() => subscribe(pl.key)} disabled={busy}><CreditCard />{paid ? `Switch to this plan` : d.status === "PAST_DUE" ? "Update payment" : `Subscribe for R${pl.price}/month`}</Button>}</div>); })}</div>}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-5">{showCancel && <Button variant="ghost" onClick={() => setConfirm(true)} disabled={busy}>Cancel subscription</Button>}
        {!d.canManage && <p className="text-sm text-muted-foreground">Only an owner or admin can change the plan.</p>}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-4" />Secure card payment by Paystack. Cancel any time.</span></div></Panel>
    <Panel title="What's included"><ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">{INCLUDED.map((t) => <li key={t} className="flex items-start gap-2.5 text-sm"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success"><Check className="size-3.5" /></span>{t}</li>)}</ul></Panel>
    <Panel title="Payment history">{d.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet. Your first payment will appear here.</p> :
      <table className="w-full text-sm"><tbody>{d.payments.map((p) => <tr key={p.reference} className="ledger-rule last:border-0"><td className="py-3 text-muted-foreground figure">{fmt(p.paidAt)}</td><td className="text-muted-foreground">Nexus Ledger, monthly plan</td><td className="text-right"><Money amount={p.amount} /></td></tr>)}</tbody></table>}</Panel>
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent><DialogTitle>Cancel your subscription?</DialogTitle><DialogDescription>You keep full access until {fmt(d.currentPeriodEnd)}. After that your books become read-only. Nothing is deleted and you can export everything.</DialogDescription>
      <div className="mt-6 flex justify-end gap-2"><DialogClose asChild><Button variant="secondary">Keep my plan</Button></DialogClose><Button variant="danger" onClick={cancel} disabled={busy}>Cancel subscription</Button></div></DialogContent></Dialog></div>);
}
