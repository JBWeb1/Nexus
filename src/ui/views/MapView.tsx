"use client";
// The contacts map: every customer and supplier with an address, coloured by type, red when they are overdue,
// bigger the more is owed. Pins come from the address ("Find from address") or a click on the map.
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { api } from "../api/client"; import { useAuth } from "../context/AuthContext";
import Panel from "../components/Panel"; import Button from "../components/Button"; import ErrorNote from "../components/ErrorNote"; import { formatMoney } from "../components/Money";

type C = { id: string; name: string; type: string; address: string | null; phone: string | null; email: string | null; latitude: number | null; longitude: number | null; locationSource: string | null; owedToYou: number; overdueToYou: number; openInvoices: number; youOwe: number; overdueYouOwe: number };
const TILES = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SA: [number, number] = [-29, 24.5];
const COLOR = { CUSTOMER: "#2563eb", SUPPLIER: "#d97706", BOTH: "#7c3aed", OVERDUE: "#dc2626" };
const colorOf = (c: C) => (c.overdueToYou > 0 || c.overdueYouOwe > 0 ? COLOR.OVERDUE : COLOR[c.type as keyof typeof COLOR] || COLOR.CUSTOMER);
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
function popup(c: C) {
  const lines = [`<strong>${esc(c.name)}</strong>`, c.address ? esc(c.address) : "", c.phone ? esc(c.phone) : ""];
  if (c.owedToYou) lines.push(`Owes you <strong>${formatMoney(c.owedToYou)}</strong>${c.overdueToYou ? ` <span style="color:${COLOR.OVERDUE}">(${formatMoney(c.overdueToYou)} overdue)</span>` : ""}`);
  if (c.youOwe) lines.push(`You owe <strong>${formatMoney(c.youOwe)}</strong>${c.overdueYouOwe ? ` <span style="color:${COLOR.OVERDUE}">(${formatMoney(c.overdueYouOwe)} overdue)</span>` : ""}`);
  return lines.filter(Boolean).join("<br/>");
}

export default function MapView() {
  const { user } = useAuth(); const canEdit = user?.role !== "VIEWER";
  const [rows, setRows] = useState<C[] | null>(null); const [error, setError] = useState<string | null>(null); const [msg, setMsg] = useState("");
  const [show, setShow] = useState<"ALL" | "CUSTOMER" | "SUPPLIER">("ALL"); const [owingOnly, setOwingOnly] = useState(false);
  const [placing, setPlacing] = useState<C | null>(null); const [busy, setBusy] = useState<string | null>(null); const [addr, setAddr] = useState<Record<string, string>>({});
  const el = useRef<HTMLDivElement>(null); const L = useRef<typeof Leaflet | null>(null); const map = useRef<Leaflet.Map | null>(null); const layer = useRef<Leaflet.LayerGroup | null>(null);
  const placingRef = useRef<C | null>(null); placingRef.current = placing; const fitted = useRef(false);

  const load = () => api.get("/map/contacts").then((d) => setRows(d.contacts)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  // Leaflet needs the browser, so it is loaded after the page is on screen.
  useEffect(() => {
    let gone = false;
    import("leaflet").then((mod) => {
      if (gone || !el.current || map.current) return;
      const lf = (mod as any).default || mod; L.current = lf;
      const m = lf.map(el.current, { center: SA, zoom: 5, scrollWheelZoom: true });
      lf.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
      layer.current = lf.layerGroup().addTo(m); map.current = m;
      m.on("click", (e: Leaflet.LeafletMouseEvent) => { const c = placingRef.current; if (c) placeAt(c, e.latlng.lat, e.latlng.lng); });
      setRows((r) => (r ? [...r] : r)); // draw pins that arrived before the map
    });
    return () => { gone = true; map.current?.remove(); map.current = null; };
  }, []);

  const visible = useMemo(() => (rows || []).filter((c) => (show === "ALL" || c.type === show || c.type === "BOTH") && (!owingOnly || c.owedToYou > 0 || c.youOwe > 0)), [rows, show, owingOnly]);
  const pinned = visible.filter((c) => c.latitude != null); const unpinned = (rows || []).filter((c) => c.latitude == null);

  useEffect(() => {
    const lf = L.current, m = map.current, g = layer.current; if (!lf || !m || !g) return;
    g.clearLayers();
    for (const c of pinned) {
      const owed = c.owedToYou + c.youOwe; const radius = 7 + Math.min(13, Math.sqrt(owed) / 15);
      lf.circleMarker([c.latitude!, c.longitude!], { radius, color: "#fff", weight: 2, fillColor: colorOf(c), fillOpacity: 0.9 }).bindPopup(popup(c)).bindTooltip(c.name).addTo(g);
    }
    if (!fitted.current && pinned.length) { fitted.current = true; m.fitBounds(lf.latLngBounds(pinned.map((c) => [c.latitude!, c.longitude!] as [number, number])).pad(0.3), { maxZoom: 13 }); }
  }, [pinned]);
  useEffect(() => { if (el.current) el.current.style.cursor = placing ? "crosshair" : ""; }, [placing]);

  const act = async (id: string, fn: () => Promise<void>) => { setBusy(id); setError(null); setMsg(""); try { await fn(); await load(); } catch (e: any) { setError(e.message); } finally { setBusy(null); } };
  const findFromAddress = (c: C) => act(c.id, async () => {
    const a = (addr[c.id] ?? c.address ?? "").trim();
    if (a !== (c.address || "")) await api.patch(`/contacts/${c.id}`, { address: a });
    const r = await api.post(`/contacts/${c.id}/locate`); setMsg(`${c.name} found: ${r.match}`);
    map.current?.setView([r.location.latitude, r.location.longitude], 14);
  });
  async function placeAt(c: C, lat: number, lng: number) { setPlacing(null); await act(c.id, async () => { await api.put(`/contacts/${c.id}/location`, { latitude: lat, longitude: lng }); setMsg(`${c.name} placed on the map.`); }); }
  const removePin = (c: C) => act(c.id, async () => { await api.delete(`/contacts/${c.id}/location`); });

  const totals = pinned.reduce((t, c) => ({ owed: t.owed + c.owedToYou, overdue: t.overdue + (c.overdueToYou > 0 ? 1 : 0) }), { owed: 0, overdue: 0 });
  const chip = (v: typeof show, label: string) => <button type="button" onClick={() => setShow(v)} className={`rounded-full border px-3 py-1 text-xs ${show === v ? "border-primary bg-primary text-primary-foreground" : "border-border text-ink-soft hover:text-foreground"}`}>{label}</button>;

  return (<div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-3xl">Map</h1><p className="text-sm text-ink-soft mt-1">Where your customers and suppliers are, and who owes what.</p></div>
      {rows && <div className="text-sm text-ink-soft">{pinned.length} on the map · {formatMoney(totals.owed)} owed to you{totals.overdue ? <> · <span className="text-destructive">{totals.overdue} overdue</span></> : null}</div>}</div>
    <ErrorNote error={error} />
    <div className="flex flex-wrap items-center gap-2">{chip("ALL", "Everyone")}{chip("CUSTOMER", "Customers")}{chip("SUPPLIER", "Suppliers")}
      <label className="ml-2 flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" checked={owingOnly} onChange={(e) => setOwingOnly(e.target.checked)} /> Only with money owing</label>
      <div className="ml-auto flex flex-wrap gap-3 text-xs text-ink-soft">{[["Customer", COLOR.CUSTOMER], ["Supplier", COLOR.SUPPLIER], ["Both", COLOR.BOTH], ["Overdue", COLOR.OVERDUE]].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: c }} />{l}</span>)}</div></div>
    {placing && <div className="rounded-md border border-primary/40 bg-primary/5 px-4 py-2 text-sm">Click the map where <strong>{placing.name}</strong> is. <button className="ml-2 underline text-ink-soft" onClick={() => setPlacing(null)}>Cancel</button></div>}
    {msg && <p className="text-sm text-success">{msg}</p>}
    <div ref={el} data-testid="contacts-map" className="h-[480px] w-full overflow-hidden rounded-lg border border-border z-0" />
    {canEdit && rows && unpinned.length > 0 && <Panel title={`Not on the map yet (${unpinned.length})`}>
      <ul className="divide-y divide-border">{unpinned.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
        <div className="w-44 min-w-0"><div className="font-medium truncate">{c.name}</div><div className="text-xs text-ink-soft">{c.type === "SUPPLIER" ? "Supplier" : c.type === "BOTH" ? "Customer and supplier" : "Customer"}</div></div>
        <input className="field min-w-[220px] flex-1" placeholder="Street, town" value={addr[c.id] ?? c.address ?? ""} onChange={(e) => setAddr({ ...addr, [c.id]: e.target.value })} />
        <Button variant="secondary" disabled={busy === c.id || !(addr[c.id] ?? c.address ?? "").trim()} onClick={() => findFromAddress(c)}>{busy === c.id ? "Finding…" : "Find from address"}</Button>
        <Button variant="ghost" onClick={() => { setPlacing(c); el.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Place by hand</Button></li>)}</ul>
      <p className="mt-3 text-xs text-ink-soft">Addresses are looked up with OpenStreetMap, one at a time. Only the address is sent, never names or amounts.</p></Panel>}
    {canEdit && pinned.length > 0 && <Panel title="On the map"><ul className="divide-y divide-border">{pinned.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
      <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorOf(c) }} /><button className="font-medium hover:underline" onClick={() => map.current?.setView([c.latitude!, c.longitude!], 15)}>{c.name}</button>
      <span className="text-xs text-ink-soft truncate flex-1">{c.address}{c.locationSource === "MANUAL" ? " · placed by hand" : ""}</span>
      {c.owedToYou > 0 && <span className="figure text-xs">{formatMoney(c.owedToYou)}</span>}
      <Button variant="ghost" onClick={() => setPlacing(c)}>Move</Button><Button variant="ghost" disabled={busy === c.id} onClick={() => removePin(c)}>Remove pin</Button></li>)}</ul></Panel>}
  </div>);
}
