// Product promo, 16:9: what Nexus Ledger does, one feature per scene. Headline on the left, the feature animating on the right.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Mail, MessageCircle, Check, CreditCard, Bell, Camera, Landmark, Wand2, Percent, Package, ClipboardList, FolderKanban, ShieldCheck, Lock, Layers, ScrollText, UserRound, FileSpreadsheet, ArrowRight, Send, FileText } from 'lucide-react';
import TL from './timeline.json';
import { C, Captions, Card, FONT, Phone, SceneShell, ease, fontFace, useSpring, type Scene, type Video } from './lib';
import { Draw, Floaters, GRAD, Pill, Ring, Wipes, Words, count } from './mg';
import { Slip } from './Receipts';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };
const MONO = 'ui-monospace, DejaVu Sans Mono, monospace';

/** Left column: numbered kicker, headline and a short line under it. */
const Side: React.FC<{ n: string; label: string; title: string; k: number; accent?: Record<number, React.CSSProperties>; sub?: string; subK?: number }> = ({ n, label, title, k, accent, sub, subK = k + 14 }) => (<>
  <div style={{ position: 'absolute', left: 150, top: 250, display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '.22em', color: C.cyan, opacity: ease(k, 0, 8) }}>
    <span style={{ color: '#fff' }}>{n}</span><div style={{ width: 54 * ease(k, 0, 12), height: 3, background: C.cyan }} />{label}</div>
  <div style={{ position: 'absolute', left: 150, top: 310, width: 720 }}><Words text={title} k={k + 2} size={82} align="left" accent={accent} /></div>
  {sub && <div style={{ position: 'absolute', left: 152, top: 640, width: 680, fontFamily: FONT, fontSize: 32, fontWeight: 600, color: C.soft, lineHeight: 1.45, opacity: ease(subK, 0, 12), transform: `translateY(${(1 - ease(subK, 0, 12)) * 20}px)` }}>{sub}</div>}
</>);
/** Right column: everything is placed inside this 760 x 760 stage. */
const Stage: React.FC<{ children: React.ReactNode; k: number }> = ({ children, k }) => { const sp = useSpring(); const p = sp(k, { damping: 16 });
  return <div style={{ position: 'absolute', left: 1010, top: 130, width: 760, height: 760, transform: `translateX(${(1 - p) * 300}px) scale(${0.9 + 0.1 * p})`, opacity: Math.min(1, p * 1.4) }}>{children}</div>; };

const Intro: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const b = cue('brand'), sa = cue('sa');
  const icons = [FileText, Percent, Camera, Landmark, Package, ShieldCheck];
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <Ring k={b} r={250} x={960} y={360} stroke={C.cyan} width={4} dur={26} rotate={f * 0.6} />
    <Ring k={b - 5} r={300} x={960} y={360} stroke="rgba(52,211,153,.45)" width={2} dur={30} rotate={-f * 0.4} />
    {icons.map((Ic, i) => { const a = (i / icons.length) * Math.PI * 2 + f / 60; const p = b >= 10 ? sp(b - 10 - i * 2) : 0;
      return <div key={i} style={{ position: 'absolute', left: 960 + Math.cos(a) * 380 * p - 40, top: 360 + Math.sin(a) * 260 * p - 40, width: 80, height: 80, borderRadius: 24, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.07)', border: `1px solid ${C.line}`, opacity: p }}><Ic size={40} color={C.blue2} /></div>; })}
    <div style={{ position: 'absolute', top: 210, transform: `scale(${sp(b, { damping: 10 })}) rotate(${(1 - sp(b)) * -20}deg)` }}><Img src={staticFile('img/logo.png')} style={{ width: 300 }} /></div>
    {sa >= 0 && <div style={{ position: 'absolute', top: 690, left: 200, right: 200 }}><Words text="Accounting, built for South African business." k={sa} size={66} stagger={2} accent={{ 3: GRAD, 4: GRAD }} /></div>}
  </AbsoluteFill>);
};

const Invoice: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const c = cue('create'), t = cue('total'), se = cue('send');
  const lines: [string, string][] = [['Coffee beans · 12 kg', '4,200.00'], ['Espresso machine service', '2,600.00'], ['Barista training · 1 day', '1,000.00']];
  const fly = ease(se, 4, 20);
  return (<AbsoluteFill>
    <Side n="01" label="INVOICING" title="Invoices in seconds." k={f} accent={{ 2: GRAD }} sub="Professional, numbered, with your logo and the VAT worked out." />
    <Stage k={f - 2}>
      <div style={{ position: 'absolute', inset: '20px 30px 120px', background: '#f8fafc', color: '#0f172a', borderRadius: 30, padding: '40px 46px', fontFamily: FONT, boxShadow: '0 40px 100px rgba(0,0,0,.55)', transform: `translateY(${-fly * 40}px) rotate(${-fly * 3}deg) scale(${1 - fly * 0.06})` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 44, fontWeight: 800 }}>Tax invoice</span><span style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>INV-0043</span></div>
        <div style={{ fontSize: 24, color: '#64748b', marginTop: 6 }}>Bill to: Karoo Coffee Roasters</div>
        <div style={{ marginTop: 34 }}>{lines.map(([a, b], i) => { const k = c - i * 9; const p = ease(k, 0, 10);
          return <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 0', borderTop: '1px solid #e2e8f0', fontSize: 27, fontWeight: 600, opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}><span>{a.slice(0, Math.ceil(a.length * ease(k, 0, 12)))}</span><span>{b}</span></div>; })}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid #e2e8f0', fontSize: 24, color: '#64748b', fontWeight: 600 }}><span>VAT 15%</span><span>R {count(t, 1170, 0, 18, 2)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0 0', borderTop: '3px solid #0f172a', fontSize: 40, fontWeight: 800 }}><span>Total</span><span>R {count(t, 8970, 0, 18, 2)}</span></div>
      </div>
      {se >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', gap: 22 }}>
        <Pill p={sp(se)}><Mail size={36} color={C.blue2} />Email · PDF attached</Pill><Pill p={sp(se - 4)}><MessageCircle size={36} color="#25d366" />WhatsApp</Pill></div>}
      {se >= 4 && <Send size={70} color={C.cyan} style={{ position: 'absolute', left: 340 + fly * 420, top: 330 - fly * 330, opacity: 1 - ease(se, 16, 22), transform: `rotate(${fly * 20}deg)` }} />}
    </Stage>
  </AbsoluteFill>);
};

const Paid: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const p = cue('pay'), l = cue('late'), r = cue('rem');
  const paid = p >= 14; const dots: [string, string][] = [['−3 days', C.blue2], ['Due', C.cyan], ['+7 days', C.amber], ['+30 days', C.red]];
  return (<AbsoluteFill>
    <Side n="02" label="GETTING PAID" title="Paid online. Chased automatically." k={f} accent={{ 1: GRAD, 3: GRAD }} sub="A secure link to pay, and reminders on a schedule you set." subK={l} />
    <Stage k={f - 2}>
      <div style={{ position: 'absolute', left: 60, top: 0, width: 330, height: 640, borderRadius: 56, padding: 14, background: '#0b1220', boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 3px rgba(255,255,255,.14)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 44, background: '#f5f7fb', color: '#0f172a', padding: '70px 24px 24px', fontFamily: FONT, position: 'relative' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#64748b' }}>Karoo Coffee Roasters</div><div style={{ fontSize: 20, fontWeight: 700, color: '#64748b', marginTop: 30 }}>You owe</div>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.03em' }}>R {paid ? '0.00' : '8,970.00'}</div>
          <div style={{ position: 'absolute', left: 24, right: 24, bottom: 40, height: 76, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 26, fontWeight: 800, color: '#fff', background: paid ? '#10b981' : '#2563eb', transform: `scale(${p >= 0 && p < 8 ? 0.93 : 1})` }}>{paid ? <><Check size={30} strokeWidth={3} />Paid</> : <><CreditCard size={28} />Pay now</>}</div></div></div>
      {paid && Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2, d = ease(p - 14, 0, 16) * 220; return <div key={i} style={{ position: 'absolute', left: 225 + Math.cos(a) * d, top: 560 + Math.sin(a) * d * 0.6, width: 14, height: 14, borderRadius: 4, background: [C.green, C.cyan, C.amber][i % 3], opacity: 1 - ease(p - 14, 8, 18) }} />; })}
      <div style={{ position: 'absolute', left: 470, top: 40, width: 4, height: 560 * ease(r, 0, 30), background: `linear-gradient(${C.blue2},${C.red})` }} />
      {l >= 0 && <div style={{ position: 'absolute', left: 452, top: -4, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontSize: 26, fontWeight: 800, color: C.soft, opacity: ease(l, 0, 8) }}><Bell size={30} color={C.amber} />Reminders</div>}
      {dots.map(([t, col], i) => { const k = r - i * 6; const q = k >= 0 ? sp(k, { damping: 11 }) : 0;
        return <div key={t} style={{ position: 'absolute', left: 452, top: 60 + i * 170, display: 'flex', alignItems: 'center', gap: 18, transform: `scale(${q})`, transformOrigin: '20px 20px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: col, boxShadow: `0 0 30px ${col}`, display: 'grid', placeItems: 'center' }}><Mail size={20} color="#06101f" /></div>
          <span style={{ fontFamily: FONT, fontSize: 30, fontWeight: 800, color: '#fff' }}>{t}</span></div>; })}
    </Stage>
  </AbsoluteFill>);
};

const Receipts: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const sn = cue('snap'), rd = cue('read'), v = cue('vat');
  const fields: [string, string, number][] = [['Supplier', 'Sasol Paarl', rd], ['Total', 'R 650.00', rd + 8], ['VAT', 'R 84.78', v]];
  const hi = v >= 0 ? 3 : rd >= 8 ? 2 : rd >= 0 ? 0 : -1;
  return (<AbsoluteFill>
    <Side n="03" label="RECEIPTS" title="Snap a slip. Nexus reads it." k={f} accent={{ 3: GRAD, 4: GRAD }} sub="Supplier, date, total and VAT, ready to check and save as a bill." subK={rd} />
    <Stage k={f - 2}>
      <div style={{ position: 'absolute', left: 30, top: 30, transform: 'rotate(-3deg)' }}><Slip w={380} hi={hi} /></div>
      {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: 'absolute', width: 70, height: 70, border: '6px solid #fff', ...[{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }, { left: 390, top: 0, borderLeft: 0, borderBottom: 0 }, { left: 390, top: 560, borderLeft: 0, borderTop: 0 }, { left: 0, top: 560, borderRight: 0, borderTop: 0 }][i], borderRadius: 14, opacity: 1 - ease(rd, 0, 8) }} />)}
      <AbsoluteFill style={{ background: '#fff', opacity: sn >= 0 ? ease(sn, 0, 9, 0.85, 0) : 0, borderRadius: 30 }} />
      <div style={{ position: 'absolute', left: 470, top: 70, display: 'flex', flexDirection: 'column', gap: 18, width: 290 }}>
        {fields.map(([a, b, k]) => { const q = k >= 0 ? sp(k, { damping: 12 }) : 0; return <Card key={a} style={{ padding: '18px 22px', transform: `translateX(${(1 - q) * 120}px)`, opacity: q, borderColor: 'rgba(103,232,249,.55)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 700, color: C.soft }}>{a}<Check size={26} color={C.green} strokeWidth={3} /></div><div style={{ fontSize: 34, fontWeight: 800, marginTop: 4 }}>{b}</div></Card>; })}</div>
    </Stage>
  </AbsoluteFill>);
};

const Bank: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const m = cue('match'), r = cue('rules');
  const rows: [string, string, string, boolean][] = [['EFT Karoo Coffee', '+8,970.00', 'Matches INV-0043', true], ['Paarl Bakery', '+3,450.00', 'Matches INV-0039', true], ['SASOL PAARL', '−650.00', 'Rule: Fuel → Vehicle costs', false], ['TELKOM DEBIT', '−899.00', 'Rule: Telephone & internet', false]];
  return (<AbsoluteFill>
    <Side n="04" label="BANKING" title="Bank lines, matched for you." k={f} accent={{ 3: GRAD, 4: GRAD }} sub="Nexus suggests the match. Your rules sort the rest." subK={r} />
    <Stage k={f - 2}>
      <Card style={{ position: 'absolute', inset: '40px 0 60px', padding: '16px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, fontWeight: 800, color: C.soft, padding: '14px 0' }}><Landmark size={32} color={C.blue2} />Business account · statement</div>
        {rows.map(([d, a, tag, isMatch], i) => { const k = (isMatch ? m : r) - (i % 2) * 6; const q = k >= 0 ? sp(k, { damping: 12 }) : 0;
          return <div key={d} style={{ padding: '20px 0', borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 26, fontWeight: 700 }}><span>{d}</span><span style={{ color: a.startsWith('+') ? C.green : '#fff' }}>{a}</span></div>
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 999, fontSize: 22, fontWeight: 800, background: isMatch ? 'rgba(124,179,255,.16)' : 'rgba(52,211,153,.16)', color: isMatch ? C.blue2 : C.green, transform: `scale(${q})`, transformOrigin: '0 50%', opacity: q }}>{isMatch ? <Check size={24} /> : <Wand2 size={24} />}{tag}</div></div>; })}
      </Card>
    </Stage>
  </AbsoluteFill>);
};

const Vat: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const v = cue('vat'), b = cue('books');
  const rows: [string, number][] = [['Output tax · sales', 41820], ['Input tax · purchases', 18436.52], ['VAT payable', 23383.48]];
  return (<AbsoluteFill>
    <Side n="05" label="VAT" title="VAT201, worked out." k={v} accent={{ 0: GRAD }} sub="Straight from your invoices and bills, for every period." subK={b} />
    <Stage k={f - 2}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 40, textAlign: 'center', fontFamily: FONT, fontSize: 150, fontWeight: 800, letterSpacing: '-.05em' }}><span style={GRAD}>VAT201</span></div>
      <Card style={{ position: 'absolute', left: 30, right: 30, top: 280, padding: '14px 40px' }}>
        {rows.map(([t, n], i) => { const k = v + 6 - i * 8; return <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 0', borderTop: i ? `1px solid ${C.line}` : 0, fontSize: i === 2 ? 40 : 32, fontWeight: 800, color: i === 2 ? C.green : '#fff' }}>
          <span style={{ color: i === 2 ? C.green : C.soft }}>{t}</span><span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>R {count(k, n, 0, 22, 2)}{i === 2 && b >= 0 && <Check size={38} color={C.green} strokeWidth={3} style={{ transform: `scale(${sp(b)})` }} />}</span></div>; })}
      </Card>
    </Stage>
  </AbsoluteFill>);
};

const Ops: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const st = cue('stock'), po = cue('po'), pr = cue('proj');
  const proj: [string, number][] = [['Café fit-out', 0.85], ['Menu shoot', 0.55], ['Event catering', -0.3]];
  const card = (k: number, top: number, children: React.ReactNode) => { const q = k >= 0 ? sp(k, { damping: 13 }) : 0; return <Card style={{ position: 'absolute', left: 0, right: 0, top, height: 220, padding: '26px 34px', transform: `translateX(${(1 - q) * 300}px)`, opacity: q }}>{children}</Card>; };
  return (<AbsoluteFill>
    <Side n="06" label="OPERATIONS" title="Stock, orders and projects." k={f} accent={{ 0: GRAD, 2: GRAD, 4: GRAD }} sub="Average cost, purchase orders that become bills, and profit per project." subK={pr} />
    <Stage k={f - 2}>
      {card(st, 0, <><div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 800 }}><Package size={36} color={C.blue2} />Coffee beans · 1 kg</div>
        <div style={{ display: 'flex', gap: 50, marginTop: 22 }}><div><div style={{ fontSize: 22, color: C.soft, fontWeight: 700 }}>On hand</div><div style={{ fontSize: 52, fontWeight: 800 }}>{count(st, 148, 0, 20)}</div></div><div><div style={{ fontSize: 22, color: C.soft, fontWeight: 700 }}>Average cost</div><div style={{ fontSize: 52, fontWeight: 800 }}>R {count(st, 182.4, 0, 20, 2)}</div></div></div></>)}
      {card(po, 260, <><div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 800 }}><ClipboardList size={36} color={C.amber} />Purchase order PO-0012</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 30, fontSize: 32, fontWeight: 800 }}><span style={{ padding: '10px 22px', borderRadius: 14, background: 'rgba(251,191,36,.15)', color: C.amber }}>Ordered</span><ArrowRight size={36} color={C.soft} style={{ opacity: ease(po, 10, 16) }} />
          <span style={{ padding: '10px 22px', borderRadius: 14, background: 'rgba(52,211,153,.15)', color: C.green, opacity: ease(po, 14, 22) }}>Bill created</span></div></>)}
      {card(pr, 520, <><div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 800 }}><FolderKanban size={36} color={C.green} />Profit by project</div>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>{proj.map(([n, v], i) => <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 22, fontWeight: 700 }}><span style={{ width: 200, color: C.soft }}>{n}</span>
          <div style={{ height: 22, borderRadius: 11, width: Math.abs(v) * 380 * ease(pr - i * 4, 4, 20), background: v > 0 ? C.green : C.red }} /></div>)}</div></>)}
    </Stage>
  </AbsoluteFill>);
};

const Health: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const ch = cue('check'), a = cue('all');
  const checks: [string, string][] = [['c1', 'Debits = credits'], ['c2', 'Receivables'], ['c3', 'Stock'], ['all', 'Every document posted'], ['all', 'Bank lines'], ['all', 'Locked entries']];
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 150, left: 0, right: 0 }}><Words text="Books that check themselves." k={f} size={84} accent={{ 1: GRAD, 2: GRAD, 3: GRAD }} /></div>
    <Ring k={ch} r={190} x={960} y={560} stroke={C.green} width={10} dur={40} />
    <div style={{ position: 'absolute', top: 470, transform: `scale(${ch >= 0 ? sp(ch, { damping: 11 }) : 0})` }}><ShieldCheck size={180} color={C.green} strokeWidth={1.5} /></div>
    {checks.map(([c, t], i) => { const k = cue(c) - (c === 'all' ? (i - 3) * 3 : 0); const q = k >= 0 ? sp(k, { damping: 11 }) : 0; const left = i % 2 === 0;
      return <div key={t} style={{ position: 'absolute', top: 400 + Math.floor(i / 2) * 120, left: left ? 240 : 1260, width: 420, display: 'flex', justifyContent: left ? 'flex-end' : 'flex-start' }}>
        <Pill p={q} color="rgba(52,211,153,.55)" style={{ fontSize: 28, whiteSpace: 'nowrap' }}><Check size={30} color={C.green} strokeWidth={3} />{t}</Pill></div>; })}
  </AbsoluteFill>);
};

const Secure: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring();
  const items: [string, React.ReactNode, string, string][] = [['lock', <Lock size={64} color={C.cyan} />, 'Locked entries', 'Posted entries can only be reversed, never quietly edited.'], ['wall', <Layers size={64} color={C.cyan} />, 'Walled-off companies', 'Each company’s data is kept separate inside the database.'], ['log', <ScrollText size={64} color={C.cyan} />, 'Every change logged', 'Who did what, and when.']];
  return (<AbsoluteFill>
    <div style={{ position: 'absolute', left: 150, top: 170 }}><Words text="Built to be trusted." k={f} size={90} align="left" accent={{ 3: GRAD }} /></div>
    <div style={{ position: 'absolute', left: 150, right: 150, top: 380, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40 }}>
      {items.map(([c, ic, t, d]) => { const k = cue(c) + 4; const q = k >= 0 ? sp(k, { damping: 14 }) : 0;
        return <div key={c} style={{ position: 'relative', height: 400 }}>
          <Draw k={k} dur={20} size={[500, 400]} len={1900} stroke={C.cyan} width={3} d="M24 2 H476 Q498 2 498 24 V376 Q498 398 476 398 H24 Q2 398 2 376 V24 Q2 2 24 2 Z" />
          <div style={{ position: 'absolute', inset: 0, padding: 42, fontFamily: FONT, opacity: q, transform: `translateY(${(1 - q) * 30}px)` }}>{ic}
            <div style={{ fontSize: 42, fontWeight: 800, marginTop: 26, color: '#fff' }}>{t}</div><div style={{ fontSize: 28, fontWeight: 600, color: C.soft, marginTop: 14, lineHeight: 1.4 }}>{d}</div></div></div>; })}</div>
  </AbsoluteFill>);
};

const Team: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const iv = cue('invite'), x = cue('excel');
  const files = ['trial-balance.xlsx', 'general-ledger.xlsx', 'invoices.xlsx'];
  return (<AbsoluteFill>
    <Side n="07" label="YOUR ACCOUNTANT" title="Bring your accountant in." k={f} accent={{ 3: GRAD }} sub="Their own login and role. Export to Excel whenever you need." subK={x} />
    <Stage k={f - 2}>
      <Card style={{ position: 'absolute', left: 0, right: 0, top: 30, padding: '30px 36px', transform: `scale(${iv >= 0 ? sp(iv) : 0})` }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '.14em', color: C.soft }}>TEAM AND ACCOUNTANT ACCESS</div>
        {[['You', 'Owner'], ['accountant@firm.co.za', 'Accountant']].map(([n, r], i) => <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 0', borderTop: i ? `1px solid ${C.line}` : 0, fontSize: 30, fontWeight: 800, opacity: i ? ease(iv, 10, 18) : 1 }}>
          <UserRound size={40} color={C.blue2} />{n}<span style={{ marginLeft: 'auto', padding: '6px 18px', borderRadius: 999, background: 'rgba(124,179,255,.16)', color: C.blue2, fontSize: 24 }}>{r}</span></div>)}
      </Card>
      {files.map((n, i) => { const k = x - i * 5; const q = k >= 0 ? sp(k, { damping: 12 }) : 0;
        return <div key={n} style={{ position: 'absolute', left: 30 + i * 240, top: 440, width: 220, height: 250, borderRadius: 26, background: 'rgba(255,255,255,.07)', border: '2px solid rgba(34,197,94,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, transform: `translateY(${(1 - q) * 200}px) rotate(${(1 - q) * 12}deg)`, opacity: q }}>
          <FileSpreadsheet size={80} color="#22c55e" /><span style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: '#fff' }}>{n}</span></div>; })}
    </Stage>
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const b = cue('brand'), p = cue('price'), fr = cue('free');
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <Ring k={b} r={170} x={960} y={250} stroke={C.cyan} width={4} dur={22} rotate={f * 0.6} />
    <div style={{ position: 'absolute', top: 120, transform: `scale(${sp(b, { damping: 10 })})` }}><Img src={staticFile('img/logo.png')} style={{ width: 220 }} /></div>
    <div style={{ position: 'absolute', top: 460, left: 200, right: 200 }}><Words text="Everything your business needs." k={b + 14} size={76} accent={{ 1: GRAD, 2: GRAD }} /></div>
    {p >= 0 && <div style={{ position: 'absolute', top: 590, fontFamily: FONT, fontSize: 52, fontWeight: 800, color: '#fff', transform: `scale(${1.3 - 0.3 * sp(p)})`, opacity: ease(p, 0, 6) }}><span style={GRAD}>R250</span> a month <span style={{ color: C.soft, fontWeight: 700 }}>· per company</span></div>}
    {fr >= 0 && <div style={{ position: 'absolute', top: 730, transform: `scale(${sp(fr) * (1 + 0.03 * Math.sin(f / 5))})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '28px 56px', borderRadius: 999, background: 'linear-gradient(90deg,#2563eb,#0ea5e9)', fontFamily: FONT, fontSize: 44, fontWeight: 800, color: '#fff', boxShadow: '0 24px 70px -12px rgba(37,99,235,.8)' }}>Try it free for 14 days<ArrowRight size={46} /></div></div>}
  </AbsoluteFill>);
};

const SCENES = { intro: Intro, invoice: Invoice, paid: Paid, receipts: Receipts, bank: Bank, vat: Vat, ops: Ops, health: Health, secure: Secure, team: Team, end: End } as const;
export const Promo: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).promo; const { fps } = useVideoConfig(); const f = useCurrentFrame();
  const cuts = v.scenes.slice(1).map((s) => Math.round(s.start * fps)); const first = cuts[0], last = cuts[cuts.length - 1];
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter="none"><Floaters seed={i} /><Comp s={s} /></SceneShell></Sequence>; })}
    <Wipes cuts={cuts} />
    <div style={{ position: 'absolute', left: 60, top: 44, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '.16em', color: '#fff', opacity: f >= first && f < last ? 0.85 : 0 }}><Img src={staticFile('img/logo.png')} style={{ height: 40 }} />NEXUS LEDGER</div>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, background: 'rgba(255,255,255,.06)' }}><div style={{ height: '100%', width: `${(f / v.frames) * 100}%`, background: 'linear-gradient(90deg,#2563eb,#67e8f9,#34d399)' }} /></div>
    <Captions video={v} top={950} size={42} side={300} /><Audio src={staticFile('audio/promo.wav')} />
  </AbsoluteFill>);
};
