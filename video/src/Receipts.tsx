// "Lose the shoebox": hook on a month-end pile of slips; a photo becomes a bill, with the VAT ready for the VAT201.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Camera, Check, BookOpen, Package, Sparkles } from 'lucide-react';
import TL from './timeline.json';
import { Brand, Btn, C, Captions, Card, FONT, SceneShell, ease, fontFace, shake, useSpring, type Scene, type Video } from './lib';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };
const MONO = 'ui-monospace, DejaVu Sans Mono, monospace';
const FIELDS: [string, string, string][] = [['f1', 'Supplier', 'Sasol Paarl'], ['f2', 'Date', '24 Oct 2026'], ['f3', 'Total', 'R 650.00'], ['f4', 'VAT', 'R 84.78']];

/** A till slip. `hi` highlights one of its lines (0 supplier, 1 date, 2 total, 3 VAT) while it is being read. */
const Slip: React.FC<{ w?: number; hi?: number; style?: React.CSSProperties }> = ({ w = 520, hi = -1, style }) => {
  const row = (i: number, a: React.ReactNode, b?: React.ReactNode) => <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 6, background: i >= 0 && hi === i ? 'rgba(37,99,235,.18)' : 'none', outline: i >= 0 && hi === i ? '3px solid #2563eb' : 'none' }}><span>{a}</span><span>{b}</span></div>;
  return (<div style={{ width: w, padding: '40px 34px 50px', background: '#fbfaf6', color: '#1f2937', fontFamily: MONO, fontSize: w / 21, lineHeight: 1.55, boxShadow: '0 30px 80px rgba(0,0,0,.5)', clipPath: 'polygon(0 0,100% 0,100% 97%,95% 100%,90% 97%,85% 100%,80% 97%,75% 100%,70% 97%,65% 100%,60% 97%,55% 100%,50% 97%,45% 100%,40% 97%,35% 100%,30% 97%,25% 100%,20% 97%,15% 100%,10% 97%,5% 100%,0 97%)', ...style }}>
    <div style={{ textAlign: 'center', fontWeight: 700 }}>{row(0, <b>SASOL PAARL</b>)}</div>
    <div style={{ textAlign: 'center', fontSize: '.8em' }}>TAX INVOICE · VAT No 4120187654</div>
    {row(1, '24/10/2026', '07:42')}
    <div style={{ borderTop: '2px dashed #9ca3af', margin: '10px 0' }} />
    {row(-1, 'DIESEL 50PPM', '600.00')}{row(-1, 'COFFEE', '50.00')}
    <div style={{ borderTop: '2px dashed #9ca3af', margin: '10px 0' }} />
    {row(2, <b>TOTAL</b>, <b>R 650.00</b>)}{row(3, 'VAT 15% incl', '84.78')}{row(-1, 'CARD', '****4417')}
  </div>);
};

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const b = cue('box'), fam = cue('familiar');
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 240, fontSize: 92, fontWeight: 800, letterSpacing: '-.04em', transform: `scale(${1.25 - 0.25 * sp(f)})`, opacity: ease(f, 0, 6) }}>Month <span style={{ color: C.amber }}>end.</span></div>
    {Array.from({ length: 16 }).map((_, i) => { const k = b - i * 2; const drop = ease(k, 0, 14); const x = 160 + random(`x${i}`) * 560, rot = (random(`r${i}`) - 0.5) * 70;
      return k >= 0 && <div key={i} style={{ position: 'absolute', left: x, top: -260 + drop * (900 + random(`y${i}`) * 140), width: 200, height: 260, background: '#fbfaf6', borderRadius: 6, transform: `rotate(${rot * drop}deg)`, boxShadow: '0 10px 30px rgba(0,0,0,.45)', padding: 22 }}>
        {[0, 1, 2, 3, 4, 5].map((l) => <div key={l} style={{ height: 10, margin: '12px 0', borderRadius: 5, width: `${50 + random(`l${i}${l}`) * 50}%`, background: '#cbd5e1' }} />)}</div>; })}
    <div style={{ position: 'absolute', top: 1020, width: 700, height: 300, transform: shake(fam, 24, 16) }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(#a16207,#854d0e)', borderRadius: '10px 10px 24px 24px', boxShadow: '0 30px 80px rgba(0,0,0,.6)', display: 'grid', placeItems: 'center', fontSize: 52, fontWeight: 800, color: 'rgba(0,0,0,.4)', letterSpacing: '.1em' }}>RECEIPTS</div></div>
    {fam >= 0 && <div style={{ position: 'absolute', top: 400, padding: '20px 44px', borderRadius: 22, background: 'rgba(6,13,29,.85)', border: `5px solid ${C.amber}`, fontSize: 84, fontWeight: 800, transform: `scale(${2 - sp(fam, { damping: 9, stiffness: 240 })}) rotate(-3deg)` }}>Sound familiar?</div>}
  </AbsoluteFill>);
};

const Snap: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const k = cue('snap');
  const corner = (r: number) => <div style={{ position: 'absolute', width: 90, height: 90, border: `8px solid #fff`, borderRadius: 18, clipPath: 'polygon(0 0,60% 0,60% 12%,12% 12%,12% 60%,0 60%)', transform: `rotate(${r}deg)`, ...[{ left: 0, top: 0 }, { right: 0, top: 0 }, { right: 0, bottom: 0 }, { left: 0, bottom: 0 }][r / 90] }} />;
  const zoom = 1.04 - 0.04 * sp(f);
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 290, transform: `scale(${zoom}) rotate(-2deg)` }}><Slip w={560} /></div>
    <div style={{ position: 'absolute', top: 240, left: 170, width: 740, height: 1000, transform: `scale(${k >= 0 ? 1 - 0.04 * Math.sin(Math.min(Math.PI, k / 3)) : 1.08 - 0.08 * sp(f)})` }}>{[0, 90, 180, 270].map(corner)}</div>
    <div style={{ position: 'absolute', top: 1270, width: 150, height: 150, borderRadius: '50%', border: '8px solid #fff', display: 'grid', placeItems: 'center', transform: `scale(${k >= 0 && k < 6 ? 0.85 : 1})` }}><div style={{ width: 112, height: 112, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center' }}><Camera size={54} color="#0f172a" /></div></div>
    <AbsoluteFill style={{ background: '#fff', opacity: k >= 0 ? ease(k, 0, 10, 0.9, 0) : 0 }} />
  </AbsoluteFill>);
};

const Read: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const lit = FIELDS.filter(([c]) => cue(c) >= 0).length;
  const scan = (f % 40) / 40;
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 80, top: 230, transform: `rotate(-2deg) scale(${0.96 + 0.04 * sp(f)})` }}>
      <div style={{ position: 'relative' }}><Slip w={430} hi={lit - 1} />
        {lit < 4 && <div style={{ position: 'absolute', left: -10, right: -10, top: `${scan * 100}%`, height: 6, background: C.cyan, boxShadow: `0 0 30px ${C.cyan}` }} />}</div></div>
    <div style={{ position: 'absolute', left: 560, right: 60, top: 260, display: 'flex', alignItems: 'center', gap: 12, fontSize: 32, fontWeight: 800, color: C.cyan }}>{lit < 4 ? <><Sparkles size={40} />Reading…</> : <span style={{ color: C.green, display: 'flex', alignItems: 'center', gap: 12 }}><Check size={40} />Read in seconds</span>}</div>
    <div style={{ position: 'absolute', left: 60, right: 60, top: 880, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
      {FIELDS.map(([c, label, val]) => { const k = cue(c); const p = k >= 0 ? sp(k, { damping: 11, stiffness: 220 }) : 0;
        return (<Card key={c} style={{ padding: '26px 30px', borderColor: k >= 0 ? 'rgba(103,232,249,.6)' : C.line, transform: `scale(${0.92 + 0.08 * p})` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 700, color: C.soft }}>{label}{k >= 0 && <Check size={34} color={C.green} strokeWidth={3} style={{ transform: `scale(${p})` }} />}</div>
          <div style={{ fontSize: 46, fontWeight: 800, marginTop: 8, minHeight: 60 }}>{k >= 0 ? val.slice(0, Math.ceil(val.length * ease(k, 0, 8))) : ''}</div></Card>); })}
    </div>
  </AbsoluteFill>);
};

const Save: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const c = cue('check'), sv = cue('save'), bk = cue('books');
  const fly = ease(sv, 6, 22); const press = sv >= 0 && sv < 6 ? 0.92 : 1;
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <Card style={{ position: 'absolute', left: 90, right: 90, top: 260, padding: '36px 44px', transform: `translateY(${fly * 560}px) scale(${1 - 0.7 * fly})`, opacity: 1 - ease(sv, 16, 22) }}>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '.16em', color: C.blue2, marginBottom: 14 }}>NEW BILL</div>
      {FIELDS.map(([k, label, val], i) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', borderTop: i ? `1px solid ${C.line}` : 0, fontSize: 40, fontWeight: 700 }}>
        <span style={{ color: C.soft }}>{label}</span><span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>{val}{c >= 0 && <Check size={36} color={C.green} strokeWidth={3} style={{ transform: `scale(${sp(c - i * 3)})` }} />}</span></div>)}
      <div style={{ marginTop: 26, height: 110, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 800, background: 'linear-gradient(90deg,#2563eb,#0ea5e9)', transform: `scale(${press})` }}>Save bill</div>
    </Card>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 980, display: 'flex', justifyContent: 'center', transform: `scale(${1 + (bk >= 0 ? 0.15 * Math.sin(Math.min(Math.PI, bk / 5)) : 0)})` }}><BookOpen size={200} color={C.green} strokeWidth={1.6} /></div>
    {bk >= 0 && <Card style={{ position: 'absolute', left: 110, right: 110, top: 1210, padding: '24px 34px', display: 'flex', justifyContent: 'space-between', fontSize: 36, fontWeight: 800, borderColor: 'rgba(52,211,153,.6)', transform: `translateY(${(1 - sp(bk)) * 60}px)`, opacity: Math.min(1, bk / 5) }}><span>Bill · Sasol Paarl</span><span>R 650.00</span></Card>}
  </AbsoluteFill>);
};

const Vat: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const v = cue('vat'), r = cue('r201');
  const amt = (84.78 * ease(v, 4, 26)).toFixed(2);
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 260, fontSize: 150, fontWeight: 800, letterSpacing: '-.05em', transform: `scale(${r >= 0 ? 1.25 - 0.25 * sp(r, { damping: 9 }) : 0.9 + 0.1 * sp(f)})` }}>
      <span style={{ background: 'linear-gradient(90deg,#7cb3ff,#67e8f9 55%,#6ee7b7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>VAT201</span></div>
    <Card style={{ position: 'absolute', left: 90, right: 90, top: 560, padding: '38px 44px', transform: `translateY(${(1 - sp(f - 3)) * 300}px)` }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: C.soft }}>Input tax · this period</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
        <span style={{ fontSize: 40, fontWeight: 800 }}>Sasol Paarl</span><span style={{ fontSize: 64, fontWeight: 800, color: C.green }}>R {amt}</span></div>
      <div style={{ marginTop: 24, height: 12, borderRadius: 6, background: 'rgba(255,255,255,.08)' }}><div style={{ height: '100%', width: `${100 * ease(v, 4, 26)}%`, borderRadius: 6, background: 'linear-gradient(90deg,#34d399,#67e8f9)' }} /></div>
    </Card>
    {r >= 0 && <div style={{ position: 'absolute', top: 1000, display: 'flex', alignItems: 'center', gap: 14, padding: '20px 34px', borderRadius: 999, background: 'rgba(52,211,153,.12)', border: '2px solid rgba(52,211,153,.5)', fontSize: 38, fontWeight: 800, transform: `scale(${sp(r - 4)})` }}><Check size={44} color={C.green} />Ready when you file</div>}
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const k = cue('keep'), l = cue('lose'), b = cue('brand');
  const poof = ease(l, 4, 16);
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 260, fontSize: 96, fontWeight: 800, letterSpacing: '-.04em', transform: `scale(${1.3 - 0.3 * sp(k)})`, opacity: Math.min(1, Math.max(0, k / 4)) }}>Keep the <span style={{ color: C.cyan }}>photo.</span></div>
    {l >= 0 && <div style={{ position: 'absolute', top: 400, fontSize: 96, fontWeight: 800, letterSpacing: '-.04em', transform: `scale(${1.3 - 0.3 * sp(l)})`, opacity: Math.min(1, l / 4) }}>Lose the <span style={{ color: C.amber }}>shoebox.</span></div>}
    <div style={{ position: 'absolute', top: 600, transform: `scale(${(1 - poof) * sp(f)}) rotate(${poof * 40}deg)`, opacity: 1 - poof }}><Package size={240} color={C.amber} strokeWidth={1.4} /></div>
    {l >= 4 && Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2, d = ease(l, 4, 20) * 260;
      return <div key={i} style={{ position: 'absolute', left: 540 + Math.cos(a) * d - 14, top: 720 + Math.sin(a) * d - 14, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.35)', opacity: 1 - ease(l, 10, 22) }} />; })}
    {b >= 0 && <div style={{ position: 'absolute', top: 640, transform: `scale(${sp(b, { damping: 10 })})` }}><Img src={staticFile('img/logo.png')} style={{ width: 300 }} /></div>}
    {b >= 0 && <div style={{ position: 'absolute', top: 1060, transform: `scale(${sp(b - 8) * (1 + 0.03 * Math.sin(f / 5))})` }}><Btn><Camera size={46} />Try it free · 14 days</Btn></div>}
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, snap: Snap, read: Read, save: Save, vat: Vat, end: End } as const;
const ENTER = { snap: 'wipe', read: 'zoom', save: 'slide', vat: 'wipe', end: 'zoom' } as const;
export const Receipts: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).receipts; const { fps } = useVideoConfig(); const f = useCurrentFrame(); const endStart = Math.round(v.scenes[v.scenes.length - 1].start * fps);
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter={i === 0 ? 'none' : ENTER[s.id as keyof typeof ENTER]}><Comp s={s} /></SceneShell></Sequence>; })}
    <Brand hidden={f >= endStart} /><Captions video={v} /><Audio src={staticFile('audio/receipts.wav')} />
  </AbsoluteFill>);
};
