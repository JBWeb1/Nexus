// Investor and partner pitch, 16:9. Market, problem, product, trust, business model, the arithmetic of 1%, status, the ask.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Percent, MessageCircle, Camera, ShieldCheck, Lock, Layers, ScrollText, Building2, Check, ArrowRight, Store } from 'lucide-react';
import TL from './timeline.json';
import { C, Captions, Card, FONT, Phone, SceneShell, ease, fontFace, shake, useSpring, type Scene, type Video } from './lib';
import { Draw, Floaters, GRAD, Pill, Ring, Source, Wipes, Words, count } from './mg';

/** Shown on the last frame when set, e.g. an email address or website. Left empty until there is a real one. */
export const CONTACT = '';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };
const Kicker: React.FC<{ children: React.ReactNode; k: number; x?: number; y?: number; color?: string }> = ({ children, k, x = 160, y = 150, color = C.cyan }) => (
  <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT, fontSize: 24, fontWeight: 800, letterSpacing: '.24em', color, opacity: ease(k, 0, 8) }}>
    <div style={{ width: 60 * ease(k, 0, 12), height: 4, background: color }} />{children}</div>);

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const c = cue('count'), b = cue('books');
  const COLS = 34, ROWS = 12; const filled = ease(c, 0, 60);
  return (<AbsoluteFill>
    <Kicker k={f}>THE MARKET</Kicker>
    <div style={{ position: 'absolute', left: 160, top: 210, fontFamily: FONT, fontSize: 210, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 1, transform: shake(b, 10, 12) }}><span style={GRAD}>{count(c, 790000, 0, 60)}</span></div>
    <div style={{ position: 'absolute', left: 166, top: 450 }}><Words text="formal small businesses in South Africa." k={c + 4} size={54} align="left" accent={{ 4: { color: C.green } }} /></div>
    <div style={{ position: 'absolute', right: 150, top: 520, display: 'grid', gridTemplateColumns: `repeat(${COLS}, 12px)`, gap: 6 }}>
      {Array.from({ length: COLS * ROWS }).map((_, i) => { const col = i % COLS, row = Math.floor(i / COLS); const on = (col + row * 0.6) / (COLS + ROWS * 0.6) < filled; const pulse = b >= 0 ? 0.5 + 0.5 * Math.sin((b - col * 0.6) / 3) : 0;
        return <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: on ? (b >= 0 && pulse > 0.8 ? C.green : C.blue2) : 'rgba(255,255,255,.07)', opacity: on ? 0.85 : 1 }} />; })}</div>
    {b >= 0 && <div style={{ position: 'absolute', left: 166, top: 610 }}><Words text="Every one keeps books." k={b} size={84} align="left" accent={{ 3: GRAD }} /></div>}
    <Source k={c - 20}>Formal SMMEs: SEDA estimate, 2024</Source>
  </AbsoluteFill>);
};

const Problem: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const lo = cue('low'), hi = cue('high'), cap = cue('cap');
  const bars: [string, number, number][] = [['Starter', 450, lo], ['Standard', 795, lo + 8], ['Premium', 1095, hi]];
  return (<AbsoluteFill>
    <Kicker k={f}>THE PROBLEM</Kicker>
    <div style={{ position: 'absolute', left: 160, top: 210, width: 700 }}><Words text="Accounting software is getting expensive." k={f + 2} size={78} align="left" accent={{ 3: { color: C.amber } }} /></div>
    <div style={{ position: 'absolute', left: 950, right: 160, top: 160, height: 640, display: 'flex', alignItems: 'flex-end', gap: 50, borderBottom: `3px solid ${C.line}` }}>
      {bars.map(([name, v, k]) => { const h = 520 * (v / 1095) * ease(k, 0, 20);
        return (<div key={name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 800, color: '#fff', opacity: ease(k, 10, 18) }}>R{v.toLocaleString('en-US')}</div>
          <div style={{ width: '100%', height: h, borderRadius: '16px 16px 0 0', background: name === 'Premium' ? 'linear-gradient(#fbbf24,#b45309)' : 'linear-gradient(#7cb3ff,#2563eb)' }} />
          <div style={{ position: 'absolute', bottom: -56, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: C.soft }}>{name}</div>
          {name === 'Starter' && cap >= 0 && <div style={{ position: 'absolute', bottom: 140, transform: `scale(${sp(cap, { damping: 9 })}) rotate(-6deg)`, padding: '10px 18px', borderRadius: 12, border: `4px solid ${C.red}`, color: C.red, background: 'rgba(6,13,29,.85)', fontFamily: FONT, fontSize: 26, fontWeight: 800, whiteSpace: 'nowrap' }}>MAX 20 INVOICES</div>}
        </div>); })}</div>
    <div style={{ position: 'absolute', left: 950, top: 130, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.soft, opacity: ease(lo, 0, 8) }}>Xero South Africa · per month</div>
    <Source k={lo}>Xero ZA list prices, October 2026</Source>
  </AbsoluteFill>);
};

const Product: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const sa = cue('sa');
  const feats: [string, React.ReactNode, string][] = [['f1', <Percent size={34} color={C.cyan} />, 'VAT201 worked out'], ['f2', <MessageCircle size={34} color="#25d366" />, 'WhatsApp reminders'], ['f3', <Camera size={34} color={C.amber} />, 'Receipts from a photo'], ['f4', <ShieldCheck size={34} color={C.green} />, 'Books that check themselves']];
  const ph = sp(f - 2, { damping: 16 });
  return (<AbsoluteFill>
    <Kicker k={f}>THE PRODUCT</Kicker>
    <div style={{ position: 'absolute', left: 160, top: 210, width: 760 }}><Words text="Accounting built for South Africa." k={sa} size={84} align="left" accent={{ 3: GRAD, 4: GRAD }} /></div>
    <div style={{ position: 'absolute', left: 160, top: 470, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
      {feats.map(([c, ic, t]) => { const k = cue(c); return <Pill key={c} p={k >= 0 ? sp(k, { damping: 12 }) : 0} style={{ transformOrigin: '0 50%' }}>{ic}{t}</Pill>; })}</div>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `translateX(${(1 - ph) * 600}px) rotate(${(1 - ph) * 8}deg)`, transformOrigin: '75% 50%' }}>
      <Ring k={f - 6} r={430} x={1400} y={540} stroke="rgba(103,232,249,.35)" width={3} rotate={f * 0.3} dur={40} />
      <Phone src="img/dashboard-phone.png" x={1160} y={110} w={480} h={860} scroll={420} frames={Math.round(s.dur * 30)} local={f} /></div>
  </AbsoluteFill>);
};

const Trust: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const b = cue('bank');
  const cols: [string, React.ReactNode, string, string][] = [['t1', <Lock size={60} color={C.cyan} />, 'Locked entries', 'Posted entries can only be reversed, never edited. The database enforces it.'], ['t2', <Layers size={60} color={C.cyan} />, 'Walled-off companies', 'Row-level security keeps each company’s data separate inside the database.'], ['t3', <ScrollText size={60} color={C.cyan} />, 'Full activity log', 'Who did what, and when, for every change.']];
  return (<AbsoluteFill>
    <Kicker k={f}>WHY IT CAN BE TRUSTED</Kicker>
    <div style={{ position: 'absolute', left: 160, right: 160, top: 200 }}><Words text="Built like a bank ledger." k={b} size={96} align="left" accent={{ 4: GRAD }} /></div>
    <div style={{ position: 'absolute', left: 160, right: 160, top: 420, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40 }}>
      {cols.map(([c, ic, t, d]) => { const k = cue(c); const p = k >= 0 ? sp(k, { damping: 14 }) : 0;
        return (<div key={c} style={{ position: 'relative', height: 400 }}>
          <Draw k={k} dur={22} size={[490, 400]} len={1900} stroke={C.cyan} width={3} d="M24 2 H466 Q488 2 488 24 V376 Q488 398 466 398 H24 Q2 398 2 376 V24 Q2 2 24 2 Z" />
          <div style={{ position: 'absolute', inset: 0, padding: 40, fontFamily: FONT, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
            {ic}<div style={{ fontSize: 40, fontWeight: 800, color: '#fff', marginTop: 24 }}>{t}</div><div style={{ fontSize: 27, fontWeight: 600, color: C.soft, marginTop: 14, lineHeight: 1.4 }}>{d}</div></div></div>); })}</div>
  </AbsoluteFill>);
};

const Model: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const pr = cue('price'), fi = cue('firm'), cl = cue('clients');
  const N = 8, cx = 1400, cy = 520, R = 300;
  return (<AbsoluteFill>
    <Kicker k={f}>THE BUSINESS MODEL</Kicker>
    <div style={{ position: 'absolute', left: 160, top: 190, fontFamily: FONT, fontSize: 230, fontWeight: 800, letterSpacing: '-.06em', lineHeight: 1, transform: `scale(${1.4 - 0.4 * sp(pr + 2, { damping: 10 })})`, transformOrigin: '0 50%' }}><span style={GRAD}>R250</span></div>
    <div style={{ position: 'absolute', left: 170, top: 440 }}><Words text="a month, per company. Everything included." k={pr + 6} size={44} align="left" style={{ color: C.soft, fontWeight: 700 }} /></div>
    {fi >= 0 && <div style={{ position: 'absolute', left: 170, top: 560, width: 640 }}><Words text="Accounting firms bring their clients." k={fi} size={60} align="left" accent={{ 4: { color: C.green } }} /></div>}
    {fi >= 0 && <>
      {Array.from({ length: N }).map((_, i) => { const a = (i / N) * Math.PI * 2 - Math.PI / 2; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.85; const k = fi + 6 + i * 2; const lit = cl >= i * 2;
        return (<React.Fragment key={i}>
          <Draw k={k} dur={12} size={[1920, 1080]} len={400} stroke={lit ? C.green : 'rgba(124,179,255,.5)'} width={3} d={`M${cx} ${cy} L${x} ${y}`} style={{ left: 0, top: 0 }} />
          <div style={{ position: 'absolute', left: x - 50, top: y - 50, width: 100, height: 100, borderRadius: '50%', display: 'grid', placeItems: 'center', background: lit ? 'rgba(52,211,153,.18)' : '#0e1a33', border: `3px solid ${lit ? C.green : C.blue2}`, transform: `scale(${k >= 8 ? sp(k - 8) : 0})` }}><Store size={44} color={lit ? C.green : C.blue2} /></div>
          {lit && <div style={{ position: 'absolute', left: x - 60, top: y + 56, width: 120, textAlign: 'center', fontFamily: FONT, fontSize: 24, fontWeight: 800, color: C.green, opacity: ease(cl - i * 2, 0, 6) }}>R250</div>}</React.Fragment>); })}
      <div style={{ position: 'absolute', left: cx - 90, top: cy - 90, width: 180, height: 180, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#2563eb,#0ea5e9)', boxShadow: '0 0 80px rgba(37,99,235,.6)', transform: `scale(${sp(fi)})` }}><Building2 size={80} color="#fff" /></div>
      {cl >= 0 && <div style={{ position: 'absolute', left: 170, top: 730, fontFamily: FONT, fontSize: 38, fontWeight: 800, color: '#fff', opacity: ease(cl, 14, 22) }}>1 firm · 8 clients = R2,000 a month</div>}
    </>}
  </AbsoluteFill>);
};

const MathScene: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const p = cue('pct'), a = cue('arr');
  return (<AbsoluteFill>
    <Kicker k={f}>THE OPPORTUNITY</Kicker>
    <div style={{ position: 'absolute', left: 160, top: 220, display: 'grid', gridTemplateColumns: 'repeat(10, 46px)', gap: 12 }}>
      {Array.from({ length: 100 }).map((_, i) => { const on = i === 0 && p >= 0; return <div key={i} style={{ width: 46, height: 46, borderRadius: 10, background: on ? C.green : 'rgba(255,255,255,.08)', transform: on ? `scale(${1 + 0.5 * Math.max(0, 1 - p / 12)})` : `scale(${ease(f - i * 0.3, 0, 8)})`, boxShadow: on ? '0 0 40px rgba(52,211,153,.8)' : 'none' }} />; })}</div>
    <div style={{ position: 'absolute', left: 160, top: 830, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.soft, opacity: ease(p, 4, 12) }}>1% of 790,000 = 7,900 businesses</div>
    <div style={{ position: 'absolute', left: 860, top: 250 }}><Words text="If just 1% switch…" k={p} size={70} align="left" accent={{ 2: { color: C.green } }} /></div>
    {a >= 0 && <div style={{ position: 'absolute', left: 860, top: 380, fontFamily: FONT, fontSize: 210, fontWeight: 800, letterSpacing: '-.06em', lineHeight: 1, transform: `scale(${1.15 - 0.15 * sp(a)})`, transformOrigin: '0 50%' }}><span style={GRAD}>R{count(a, 23.7, 0, 36, 1)}m</span></div>}
    {a >= 0 && <div style={{ position: 'absolute', left: 868, top: 610, fontFamily: FONT, fontSize: 48, fontWeight: 800, color: '#fff', opacity: ease(a, 20, 30) }}>in revenue a year</div>}
    <Source k={a} left={868} bottom={300}>7,900 × R250 × 12 months. An illustration, not a forecast.</Source>
  </AbsoluteFill>);
};

const Status: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const b = cue('built'), pa = cue('partners');
  const steps: [string, boolean][] = [['Invoicing, bills, VAT201, banking', true], ['Stock, projects, purchase orders', true], ['Security, audit log, self-checking books', true], ['Next: customers and growth', false]];
  return (<AbsoluteFill>
    <Kicker k={f}>WHERE WE ARE</Kicker>
    <div style={{ position: 'absolute', left: 160, top: 200, width: 760 }}><Words text="Built. Working. Ready." k={b} size={100} align="left" accent={{ 2: GRAD }} /></div>
    {pa >= 0 && <div style={{ position: 'absolute', left: 160, top: 460, width: 760 }}><Words text="Now looking for partners and investors to take it to market." k={pa} size={46} align="left" stagger={2} style={{ fontWeight: 700 }} accent={{ 3: { color: C.cyan }, 5: { color: C.cyan } }} /></div>}
    <div style={{ position: 'absolute', left: 1080, top: 230, width: 3, height: 560 * ease(f, 4, 40), background: `linear-gradient(${C.green}, ${C.blue2})` }} />
    {steps.map(([t, done], i) => { const k = f - 8 - i * 9; const p = k >= 0 ? sp(k) : 0; const glow = !done && pa >= 0 ? 0.5 + 0.5 * Math.sin(f / 5) : 0;
      return (<div key={t} style={{ position: 'absolute', left: 1052, top: 220 + i * 150, display: 'flex', alignItems: 'center', gap: 30, opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', display: 'grid', placeItems: 'center', background: done ? C.green : '#0e1a33', border: `3px solid ${done ? C.green : C.cyan}`, boxShadow: `0 0 ${40 * glow}px ${C.cyan}` }}>{done ? <Check size={34} color="#052e16" strokeWidth={3.4} /> : <ArrowRight size={32} color={C.cyan} />}</div>
        <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 800, color: done ? '#fff' : C.cyan }}>{t}</div></div>); })}
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const b = cue('brand'), t = cue('talk');
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <Ring k={b} r={230} x={960} y={330} stroke={C.cyan} width={4} dur={24} rotate={f * 0.5} />
    <Ring k={b - 4} r={270} x={960} y={330} stroke="rgba(52,211,153,.5)" width={2} dur={30} rotate={-f * 0.4} />
    <div style={{ position: 'absolute', top: 160, transform: `scale(${sp(b, { damping: 11 })})` }}><Img src={staticFile('img/logo.png')} style={{ width: 340 }} /></div>
    {t >= 0 && <div style={{ position: 'absolute', top: 640 }}><Words text="Let's talk." k={t} size={110} accent={{ 1: GRAD }} /></div>}
    {t >= 0 && <div style={{ position: 'absolute', top: 800, fontFamily: FONT, fontSize: 36, fontWeight: 700, color: C.soft, opacity: ease(t, 12, 20) }}>Investors · accounting firms · distribution partners</div>}
    {CONTACT && t >= 0 && <div style={{ position: 'absolute', top: 870, fontFamily: FONT, fontSize: 40, fontWeight: 800, color: '#fff', opacity: ease(t, 18, 26) }}>{CONTACT}</div>}
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, problem: Problem, product: Product, trust: Trust, model: Model, math: MathScene, status: Status, end: End } as const;
export const Pitch: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).pitch; const { fps } = useVideoConfig(); const f = useCurrentFrame();
  const cuts = v.scenes.slice(1).map((s) => Math.round(s.start * fps)); const endStart = cuts[cuts.length - 1];
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter="none"><Floaters seed={i} /><Comp s={s} /></SceneShell></Sequence>; })}
    <Wipes cuts={cuts} />
    <div style={{ position: 'absolute', left: 60, top: 44, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: '.16em', color: '#fff', opacity: f >= endStart ? 0 : 0.85 }}><Img src={staticFile('img/logo.png')} style={{ height: 40 }} />NEXUS LEDGER</div>
    <Captions video={v} top={950} size={42} side={300} /><Audio src={staticFile('audio/pitch.wav')} />
  </AbsoluteFill>);
};
