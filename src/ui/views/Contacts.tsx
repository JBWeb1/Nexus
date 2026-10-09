"use client";
import { useEffect, useState } from "react"; import { api } from "../api/client"; import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote";
const blank = { name: "", email: "", phone: "", vatNumber: "", type: "CUSTOMER" };
export default function Contacts() {
  const [rows, setRows] = useState(null); const [error, setError] = useState(null); const [f, setF] = useState(blank); const [show, setShow] = useState(false);
  const load = () => api.get("/contacts").then((d) => setRows(d.contacts)).catch((e) => setError(e.message)); useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async (e) => { e.preventDefault(); setError(null); try { await api.post("/contacts", f); setF(blank); setShow(false); load(); } catch (err) { setError(err.message); } };
  const del = async (c) => { if (!window.confirm(`Delete ${c.name}?`)) return; try { await api.delete(`/contacts/${c.id}`); load(); } catch (err) { setError(err.message); } };
  return (<div className="space-y-6"><div className="flex items-center justify-between"><h1 className="font-display text-3xl">Contacts</h1><Button variant="gold" onClick={() => setShow(!show)}>{show ? "Cancel" : "New contact"}</Button></div><ErrorNote error={error} />
    {show && <Panel title="New contact"><form onSubmit={add} className="grid grid-cols-1 md:grid-cols-3 gap-3"><div><label className="label">Name</label><input required className="field" value={f.name} onChange={set("name")} /></div>
      <div><label className="label">Email</label><input type="email" className="field" value={f.email} onChange={set("email")} /></div><div><label className="label">Phone (WhatsApp)</label><input className="field figure" placeholder="+27…" value={f.phone} onChange={set("phone")} /></div>
      <div><label className="label">VAT number</label><input className="field figure" value={f.vatNumber} onChange={set("vatNumber")} /></div><div><label className="label">Type</label><select className="field" value={f.type} onChange={set("type")}><option value="CUSTOMER">Customer</option><option value="SUPPLIER">Supplier</option><option value="BOTH">Both</option></select></div>
      <div className="flex items-end"><Button type="submit">Save contact</Button></div></form></Panel>}
    <Panel>{!rows ? "Loading…" : rows.length === 0 ? <p className="text-sm text-ink-soft">No contacts yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-soft ledger-rule"><th className="pb-2 font-normal">Name</th><th className="pb-2 font-normal">Type</th><th className="pb-2 font-normal">Email</th><th className="pb-2 font-normal">Phone</th><th /></tr></thead>
      <tbody>{rows.map((c) => <tr key={c.id} className="ledger-rule"><td className="py-2">{c.name}</td><td className="text-ink-soft">{c.type}</td><td>{c.email}</td><td className="figure">{c.phone}</td><td className="text-right"><button className="text-xs text-brick hover:underline" onClick={() => del(c)}>Delete</button></td></tr>)}</tbody></table></div>}</Panel></div>);
}
