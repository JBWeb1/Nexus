// "Switching, sorted": hook on dreading the move away from other software; bring over who owes you and who you owe from a spreadsheet.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FileSpreadsheet, Check, Users, Truck, Landmark, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import TL from './timeline.json';
import { Brand, Btn, C, Captions, Card, FONT, SceneShell, ease, fontFace, shake, useSpring, type Scene, type Video } from './lib';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };
const grad = { background: 'linear-gradient(90deg,#7cb3ff,#67e8f9 55%,#6ee7b7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as const;
const HEAD = ['Customer', 'Invoice', 'Due date', 'Amount owing'];
const DEBTORS = [['Hotel Breede', 'INV-0388', '30/11/2026', '14,720.00'], ['Paarl Bakery', 'INV-0391', '05/12/2026', '3,450.00'], ['Cape Gear Hire', 'INV-0394', '12/12/2026', '8,925.50'], ['Stellies Deli', 'INV-0397', '15/12/2026', '1,280.00']];

/** The spreadsheet the user exports from their old software. `lit` highlights the first n header cells. */
const Sheet: React.FC<{ lit?: number; tab?: 0 | 1; style?: React.CSSProperties }> = ({ lit = 0, tab = 0, style }) => (
  <div style={{ background: '#f8fafc', color: '#0f172a', borderRadius: 26, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.55)', fontFamily: FONT, ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 26px', background: '#107c41', color: '#fff', fontSize: 30, fontWeight: 800 }}><FileSpreadsheet size={36} />opening-balances.xlsx</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.1fr 1.2fr', fontSize: 25 }}>
      {HEAD.map((h, i) => <div key={h} style={{ padding: '16px 14px', fontWeight: 800, background: i < lit ? 'rgba(103,232,249,.35)' : '#e2e8f0', outline: i < lit ? '3px solid #0891b2' : 'none', outlineOffset: -3 }}>{h}</div>)}
      {DEBTORS.flatMap((r, ri) => r.map((v, ci) => <div key={`${ri}${ci}`} style={{ padding: '16px 14px', borderTop: '1px solid #e2e8f0', textAlign: ci === 3 ? 'right' : 'left', fontWeight: ci === 0 ? 700 : 500 }}>{v}</div>))}
    </div>
    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#e2e8f0', fontSize: 24, fontWeight: 700 }}>
      {['Debtors', 'Creditors'].map((t, i) => <div key={t} style={{ padding: '8px 22px', borderRadius: 8, background: tab === i ? '#fff' : 'transparent', color: tab === i ? '#107c41' : '#64748b' }}>{t}</div>)}</div>
  </div>);

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const l = cue('leave'), d = cue('dread');
  const pct = Math.min(3, Math.floor(ease(f, 0, 30) * 3));
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <Card style={{ position: 'absolute', left: 110, right: 110, top: 380, padding: '44px 46px', transform: `${shake(d, 26, 16)} scale(${0.9 + 0.1 * sp(f)})`, borderColor: d >= 0 ? 'rgba(248,113,113,.7)' : C.line }}>
      <div style={{ fontSize: 42, fontWeight: 800 }}>Moving your books…</div>
      <div style={{ marginTop: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.max(2, pct)}%`, background: d >= 0 ? C.red : C.blue2 }} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 30, fontWeight: 700, color: d >= 0 ? C.red : C.soft }}><span>{d >= 0 ? 'Still 3%' : 'Please wait'}</span><span>{pct}%</span></div>
    </Card>
    {l >= 0 && <div style={{ position: 'absolute', top: 260, fontSize: 40, fontWeight: 800, letterSpacing: '.18em', color: C.blue2, opacity: ease(l, 0, 6) }}>LEAVING YOUR OLD SOFTWARE?</div>}
    {d >= 0 && <div style={{ position: 'absolute', top: 820, textAlign: 'center', fontSize: 104, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.04, transform: `scale(${1.6 - 0.6 * sp(d, { damping: 10 })})`, opacity: Math.min(1, d / 3) }}>Dreading<br />the <span style={{ color: C.amber }}>move?</span></div>}
  </AbsoluteFill>);
};

const Easy: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const e = cue('easy');
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 360, transform: `scale(${sp(f + 2)}) rotate(${(1 - sp(f + 2)) * 40}deg)` }}><Sparkles size={220} color={C.cyan} strokeWidth={1.5} /></div>
    <div style={{ position: 'absolute', top: 680, textAlign: 'center', fontSize: 112, fontWeight: 800, letterSpacing: '-.045em', lineHeight: 1.04 }}>
      {['Easier', 'than', 'you', 'think.'].map((w, i) => { const k = e + 2 - i * 3; const p = sp(k, { damping: 12 }); return <span key={w} style={{ display: 'inline-block', margin: '0 14px', opacity: k >= 0 ? 1 : 0, transform: `translateY(${(1 - p) * 60}px)`, ...(i === 0 ? grad : {}) }}>{w}</span>; })}</div>
    <div style={{ position: 'absolute', top: 1000, left: 180, right: 180, height: 26, borderRadius: 13, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${100 * ease(f, 4, 26)}%`, background: 'linear-gradient(90deg,#34d399,#67e8f9)' }} /></div>
  </AbsoluteFill>);
};

const SheetScene: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const db = cue('debtors'), cr = cue('creditors'), sh = cue('sheet');
  const chip = (k: number, icon: React.ReactNode, label: string, x: number) => k >= 0 && <div style={{ position: 'absolute', top: 290, left: x, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 30px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${C.line}`, fontSize: 36, fontWeight: 800, transform: `scale(${sp(k)})` }}>{icon}{label}</div>;
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    {chip(db, <Users size={40} color={C.green} />, 'Who owes you', 70)}{chip(cr, <Truck size={40} color={C.amber} />, 'Who you owe', 560)}
    <div style={{ position: 'absolute', left: 70, right: 70, top: 460, transform: `translateY(${(1 - sp(f - 2)) * 700}px) rotate(${(1 - sp(f - 2)) * 6}deg)` }}><Sheet tab={cr >= 0 ? 1 : 0} /></div>
    {sh >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 1170, display: 'flex', justifyContent: 'center', transform: `scale(${sp(sh)})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 38, fontWeight: 800 }}><FileSpreadsheet size={50} color="#22c55e" />Excel or CSV, from any software</div></div>}
  </AbsoluteFill>);
};

const Read: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const c = cue('cols'), a = cue('add'), su = cue('sup');
  const lit = c < 0 ? 0 : Math.min(4, 1 + Math.floor(c / 5)); const up = a >= 0 ? sp(a, { damping: 15 }) : 0;
  const people: [string, boolean][] = [['Hotel Breede', true], ['Paarl Bakery', true], ['Cape Gear Hire', true], ['Stellies Deli', true], ['Sasol Paarl', false], ['Telkom', false]];
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 70, right: 70, top: 240, transform: `translateY(${-up * 60}px) scale(${1 - 0.22 * up})`, transformOrigin: '50% 0' }}><Sheet lit={lit} /></div>
    {c >= 0 && a < 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 940, display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', padding: '0 60px' }}>
      {HEAD.slice(0, lit).map((h, i) => <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderRadius: 999, background: 'rgba(103,232,249,.12)', border: '2px solid rgba(103,232,249,.5)', fontSize: 32, fontWeight: 800, transform: `scale(${sp(c - i * 5)})` }}><Check size={34} color={C.cyan} strokeWidth={3} />{h}</div>)}</div>}
    {a >= 0 && <div style={{ position: 'absolute', left: 80, right: 80, top: 780, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      {people.map(([n, cust], i) => { const k = (cust ? a : su) - (cust ? i : i - 4) * 3; const p = k >= 0 ? sp(k, { damping: 12 }) : 0;
        return <Card key={n} style={{ padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 16, fontSize: 32, fontWeight: 800, opacity: p, transform: `translateY(${(1 - p) * -260}px) scale(${0.6 + 0.4 * p})` }}>
          {cust ? <Users size={34} color={C.green} /> : <Truck size={34} color={C.amber} />}{n}</Card>; })}</div>}
  </AbsoluteFill>);
};

const Check_: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const b = cue('bank'), ok = cue('ok');
  const bal = 48210.55 * ease(b, 0, 18);
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <Card style={{ position: 'absolute', left: 90, right: 90, top: 300, padding: '40px 44px', transform: `translateY(${(1 - sp(f)) * 400}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 36, fontWeight: 800 }}><Landmark size={46} color={C.blue2} />Business account</div>
      <div style={{ fontSize: 30, color: C.soft, fontWeight: 600, marginTop: 20 }}>Opening balance</div>
      <div style={{ fontSize: 100, fontWeight: 800, letterSpacing: '-.04em', marginTop: 6 }}>R {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </Card>
    {ok >= 0 && <div style={{ position: 'absolute', left: 90, right: 90, top: 780, padding: '34px 40px', borderRadius: 34, background: 'rgba(52,211,153,.12)', border: `3px solid ${C.green}`, display: 'flex', alignItems: 'center', gap: 26, transform: `scale(${1.25 - 0.25 * sp(ok, { damping: 10 })})`, opacity: Math.min(1, ok / 3), boxShadow: `0 0 ${60 * Math.abs(Math.sin(f / 10))}px rgba(52,211,153,.4)` }}>
      <ShieldCheck size={90} color={C.green} /><div><div style={{ fontSize: 50, fontWeight: 800 }}>Books check out</div><div style={{ fontSize: 32, color: C.soft, fontWeight: 600, marginTop: 6 }}>Every balance proven, from day one</div></div></div>}
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const t = cue('title'), b = cue('brand'), c = cue('cta');
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 330, textAlign: 'center', fontSize: 124, fontWeight: 800, letterSpacing: '-.045em', lineHeight: 1.02, transform: `scale(${1.3 - 0.3 * sp(t)})`, opacity: Math.min(1, Math.max(0, t / 4)) }}>Switching,<br /><span style={grad}>sorted.</span></div>
    {b >= 0 && <div style={{ position: 'absolute', top: 700, display: 'flex', alignItems: 'center', gap: 16, padding: '20px 34px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${C.line}`, fontSize: 40, fontWeight: 800, transform: `scale(${sp(b)})` }}><ShieldCheck size={44} color={C.green} />Nexus Ledger</div>}
    {c >= 0 && <div style={{ position: 'absolute', top: 1020, transform: `scale(${sp(c) * (1 + 0.03 * Math.sin(f / 5))})` }}><Btn><ArrowRight size={46} />Try it free · 14 days</Btn></div>}
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, easy: Easy, sheet: SheetScene, read: Read, check: Check_, end: End } as const;
const ENTER = { easy: 'wipe', sheet: 'slide', read: 'zoom', check: 'wipe', end: 'zoom' } as const;
export const Switch: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).switch; const { fps } = useVideoConfig(); const f = useCurrentFrame(); const endStart = Math.round(v.scenes[v.scenes.length - 1].start * fps);
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter={i === 0 ? 'none' : ENTER[s.id as keyof typeof ENTER]}><Comp s={s} /></SceneShell></Sequence>; })}
    <Brand hidden={f >= endStart} /><Captions video={v} /><Audio src={staticFile('audio/switch.wav')} />
  </AbsoluteFill>);
};
