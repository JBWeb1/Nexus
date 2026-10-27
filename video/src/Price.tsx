// "No surprises": hook on R250 slamming in, then what is (and isn't) in the price.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { X, Check, FileText, Percent, Package, FolderKanban, Camera, CalendarDays, CreditCard, Download, FileJson, FolderOpen, ShieldCheck, MapPin } from 'lucide-react';
import TL from './timeline.json';
import { Brand, Btn, C, Captions, Card, FONT, SceneShell, ease, fontFace, shake, useSpring, type Scene, type Video } from './lib';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };
const grad = { background: 'linear-gradient(90deg,#7cb3ff,#67e8f9 55%,#6ee7b7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as const;

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const k = cue('slam'), w = cue('whole');
  const p = sp(k + 2, { damping: 9, stiffness: 200, mass: 1 });
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <AbsoluteFill style={{ background: '#fff', opacity: ease(k, 0, 8, 0.55, 0) * (k >= 0 ? 1 : 0) }} />
    <div style={{ position: 'absolute', top: 470, fontSize: 330, fontWeight: 800, letterSpacing: '-.06em', transform: `${shake(k - 3, 34, 16)} scale(${3.2 - 2.2 * p})`, opacity: Math.min(1, Math.max(0.15, (k + 3) / 4)) }}><span style={grad}>R250</span></div>
    <div style={{ position: 'absolute', top: 830, fontSize: 44, fontWeight: 700, color: C.soft, opacity: ease(k, 6, 14) }}>a month · per company</div>
    {w >= 0 && <div style={{ position: 'absolute', top: 1010, fontSize: 84, fontWeight: 800, letterSpacing: '-.03em', color: '#fff', transform: `translateY(${(1 - sp(w)) * 80}px)`, opacity: Math.min(1, w / 5) }}>That's the <span style={{ color: C.green }}>whole</span> price.</div>}
  </AbsoluteFill>);
};

const None: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const end = Math.round((s.speech + 0.2) * 30);
  const rows: [string, string][] = [['a', 'Add-ons'], ['b', 'Per-user fees'], ['c', 'Upgrade to unlock']];
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    {rows.map(([c, label], i) => { const k = cue(c); return (<div key={c} style={{ position: 'absolute', left: 120, right: 120, top: 330 + i * 230, display: 'flex', alignItems: 'center', gap: 34, transform: `translateX(${(1 - sp(f - i * 4)) * -700}px)` }}>
      <div style={{ width: 96, height: 96, borderRadius: '50%', display: 'grid', placeItems: 'center', background: k >= 0 ? 'rgba(248,113,113,.18)' : 'rgba(255,255,255,.06)', border: `3px solid ${k >= 0 ? C.red : C.line}` }}><X size={56} color={C.red} strokeWidth={3} style={{ transform: `scale(${k >= 0 ? sp(k) : 0})` }} /></div>
      <div style={{ position: 'relative', fontSize: 78, fontWeight: 800, color: k >= 0 ? C.soft : '#fff' }}>{label}
        <div style={{ position: 'absolute', left: -8, top: '54%', height: 10, borderRadius: 5, background: C.red, width: `${ease(k, 0, 9) * 104}%` }} /></div></div>); })}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1060, display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: '22px 60px', borderRadius: 22, border: `6px solid ${C.green}`, color: C.green, fontSize: 96, fontWeight: 800, background: 'rgba(52,211,153,.1)', transform: `scale(${f >= end ? 2 - sp(f - end, { damping: 9 }) : 0}) rotate(-4deg)` }}>None.</div></div>
  </AbsoluteFill>);
};

const All: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const inc = cue('inc');
  const items: [string, React.ReactNode, string][] = [['i1', <FileText size={58} />, 'Invoices'], ['i2', <Percent size={58} />, 'VAT201'], ['i3', <Package size={58} />, 'Stock'], ['i4', <FolderKanban size={58} />, 'Projects'], ['i5', <Camera size={58} />, 'Receipts from photos']];
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 80, right: 80, top: 300, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26 }}>
      {items.map(([c, ic, label], i) => { const k = cue(c); const p = k >= 0 ? sp(k, { damping: 11 }) : 0; return (
        <Card key={c} style={{ gridColumn: i === 4 ? 'span 2' : undefined, padding: '40px 36px', display: 'flex', alignItems: 'center', gap: 26, fontSize: 46, fontWeight: 800, position: 'relative', transform: `scale(${p}) rotate(${(1 - p) * (i % 2 ? 8 : -8)}deg)`, opacity: p }}>
          <span style={{ color: C.blue2 }}>{ic}</span>{label}
          {inc >= 0 && <div style={{ position: 'absolute', right: 22, top: 22, width: 54, height: 54, borderRadius: '50%', background: C.green, display: 'grid', placeItems: 'center', transform: `scale(${sp(inc - i * 2)})` }}><Check size={34} color="#052e16" strokeWidth={3.4} /></div>}</Card>); })}
    </div>
    {inc >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 1090, textAlign: 'center', fontSize: 100, fontWeight: 800, letterSpacing: '-.04em', transform: `scale(${1.5 - 0.5 * sp(inc)})`, opacity: Math.min(1, inc / 4) }}><span style={grad}>All included.</span></div>}
  </AbsoluteFill>);
};

const Trial: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const d = cue('days'), c = cue('card');
  const n = Math.round(14 * ease(d, 0, 18));
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 300, transform: `rotate(${(1 - sp(f)) * -25}deg) scale(${sp(f)})` }}><CalendarDays size={230} color={C.blue2} strokeWidth={1.6} /></div>
    <div style={{ position: 'absolute', top: 600, fontSize: 170, fontWeight: 800, letterSpacing: '-.05em' }}><span style={grad}>{n} days</span></div>
    <div style={{ position: 'absolute', top: 810, fontSize: 80, fontWeight: 800, opacity: ease(d, 6, 14) }}>free</div>
    {c >= 0 && <div style={{ position: 'absolute', top: 1040, display: 'flex', alignItems: 'center', gap: 22, padding: '26px 46px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${C.line}`, fontSize: 52, fontWeight: 800, transform: `scale(${sp(c)})` }}>
      <span style={{ position: 'relative', display: 'inline-flex' }}><CreditCard size={60} color={C.blue2} /><span style={{ position: 'absolute', left: -6, top: 28, height: 6, borderRadius: 3, width: 72 * ease(c, 4, 10), background: C.red, transform: 'rotate(-30deg)' }} /></span>No card needed</div>}
  </AbsoluteFill>);
};

const Cancel: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const l = cue('leave'), t = cue('take'), k = cue('click');
  const press = t >= 0 ? 1 - 0.08 * Math.sin(Math.min(Math.PI, Math.max(0, t - 6) / 4)) : 1; const fly = ease(k, 0, 16);
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 290, fontSize: 104, fontWeight: 800, letterSpacing: '-.04em', color: '#fff', transform: `translateY(${(1 - sp(l)) * 60}px)`, opacity: Math.min(1, Math.max(0, l / 4)) }}>Leave any time.</div>
    {t >= 0 && <div style={{ position: 'absolute', top: 520, transform: `scale(${sp(t) * press})` }}><Btn style={{ background: 'linear-gradient(90deg,#059669,#10b981)' }}><Download size={50} />Download all company data</Btn></div>}
    {k >= 0 && <div style={{ position: 'absolute', top: 740 + fly * 300, left: 290 + fly * 160, display: 'flex', alignItems: 'center', gap: 14, fontSize: 40, fontWeight: 800, opacity: 1 - ease(k, 14, 20), transform: `scale(${1 - 0.5 * fly})` }}><FileJson size={70} color={C.green} />company-data.json</div>}
    <div style={{ position: 'absolute', top: 1000, transform: `scale(${k >= 0 ? 1 + 0.15 * Math.sin(Math.min(Math.PI, Math.max(0, k - 14) / 5)) : 0.0001})`, opacity: k >= 0 ? 1 : 0 }}><FolderOpen size={180} color={C.amber} strokeWidth={1.6} /></div>
    {k >= 0 && <div style={{ position: 'absolute', top: 1220, fontSize: 46, fontWeight: 700, color: C.soft, opacity: ease(k, 16, 24) }}>Every record goes with you.</div>}
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const b = cue('brand'), sa = cue('sa'), tr = cue('trust');
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 290, transform: `scale(${sp(b, { damping: 10 })})` }}><Img src={staticFile('img/logo.png')} style={{ width: 380 }} /></div>
    {sa >= 0 && <div style={{ position: 'absolute', top: 630, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 34px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${C.line}`, fontSize: 38, fontWeight: 800, transform: `scale(${sp(sa)})` }}><MapPin size={42} color={C.green} />Built in South Africa</div>}
    {tr >= 0 && <div style={{ position: 'absolute', top: 790, textAlign: 'center', fontSize: 96, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.05, transform: `scale(${1.3 - 0.3 * sp(tr)})`, opacity: Math.min(1, tr / 4) }}>Accounting you<br />can <span style={grad}>trust.</span></div>}
    {tr >= 0 && <div style={{ position: 'absolute', top: 1090, transform: `scale(${sp(tr - 10) * (1 + 0.03 * Math.sin(f / 5))})` }}><Btn><ShieldCheck size={48} />R250/month · 14 days free</Btn></div>}
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, none: None, all: All, trial: Trial, cancel: Cancel, end: End } as const;
const ENTER = { none: 'wipe', all: 'zoom', trial: 'slide', cancel: 'wipe', end: 'zoom' } as const;
export const Price: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).price; const { fps } = useVideoConfig(); const f = useCurrentFrame(); const endStart = Math.round(v.scenes[v.scenes.length - 1].start * fps);
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter={i === 0 ? 'none' : ENTER[s.id as keyof typeof ENTER]}><Comp s={s} /></SceneShell></Sequence>; })}
    <Brand hidden={f >= endStart} /><Captions video={v} /><Audio src={staticFile('audio/price.wav')} />
  </AbsoluteFill>);
};
