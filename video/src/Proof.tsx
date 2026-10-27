// "Books you can prove": hook on a R100 that doesn't add up, answer with Nexus checking itself.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ShieldCheck, Check, AlertTriangle, ArrowDown } from 'lucide-react';
import TL from './timeline.json';
import { Brand, Btn, C, Captions, Card, FONT, Phone, SceneShell, ease, fontFace, glitchShadow, shake, useSpring, type Scene, type Video } from './lib';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };
const ROWS: [string, string][] = [['Sales · INV-0011', 'R 20,700.00'], ['Rent · Unit 4', 'R 12,000.00'], ['Fuel · Sasol Paarl', 'R 650.00'], ['Receivables', 'R 100.00'], ['Bank charges', 'R 185.00'], ['Telkom fibre', 'R 899.00']];

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const g = cue('glitch'), k = cue('know');
  const zoom = 1 + 0.07 * ease(f, 0, 110);
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 110, right: 110, top: 330, transform: `scale(${zoom}) ${shake(k, 20)}`, transformOrigin: '50% 62%' }}>
      <Card style={{ padding: '26px 40px' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '.18em', color: C.soft, padding: '10px 0 18px' }}>GENERAL LEDGER · OCTOBER</div>
        {ROWS.map(([a, b], i) => { const p = sp(f - i * 3); const bad = i === 3;
          return (<div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0', borderTop: `1px solid ${C.line}`, fontSize: 40, fontWeight: 700, opacity: p, transform: `translateX(${(1 - p) * -80}px)`,
            color: bad && g >= 0 ? C.red : C.ink, textShadow: bad ? glitchShadow(g, 30) : 'none', background: bad && g >= 0 ? 'rgba(248,113,113,.08)' : 'none', margin: '0 -40px', paddingLeft: 40, paddingRight: 40 }}>
            <span>{a}</span><span style={{ transform: bad && g >= 0 ? `scale(${1 + 0.15 * Math.max(0, 1 - g / 10)})` : 'none' }}>{bad && g >= 0 ? '? ' : ''}{b}</span></div>); })}
      </Card></div>
    {k >= 0 && <div style={{ position: 'absolute', left: 60, right: 60, top: 1110, textAlign: 'center', fontSize: 96, fontWeight: 800, letterSpacing: '-.035em', color: '#fff', transform: `scale(${1.6 - 0.6 * sp(k, { damping: 11 })})`, opacity: Math.min(1, k / 4) }}>Would you <span style={{ color: C.amber }}>know?</span></div>}
  </AbsoluteFill>);
};

const Answer: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const a = cue('shield'), c = cue('checks');
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center', justifyContent: 'center' }}>
    {[0, 1, 2].map((i) => { const k = (f - i * 12) % 48; return <div key={i} style={{ position: 'absolute', top: 470, left: '50%', width: 360, height: 360, marginLeft: -180, borderRadius: '50%', border: `4px solid ${C.green}`, opacity: f > 6 ? (1 - k / 48) * 0.5 : 0, transform: `scale(${0.6 + k / 30})` }} />; })}
    <div style={{ position: 'absolute', top: 470, transform: `scale(${sp(a)}) rotate(${(1 - sp(a)) * -30}deg)` }}><ShieldCheck size={360} color={C.green} strokeWidth={1.6} /></div>
    <div style={{ position: 'absolute', top: 920, fontSize: 104, fontWeight: 800, letterSpacing: '-.04em', textAlign: 'center', lineHeight: 1.05, color: '#fff' }}>
      {['Nexus', 'checks', 'itself.'].map((w, i) => { const p = sp(c - i * 4, { damping: 12 }); return <span key={w} style={{ display: 'inline-block', margin: '0 14px', opacity: c - i * 4 >= 0 ? 1 : 0, transform: `translateY(${(1 - p) * 60}px)`, color: i ? C.green : '#fff' }}>{w}</span>; })}</div>
  </AbsoluteFill>);
};

const ITEMS: [string, string, string][] = [['c1', 'Debits equal credits', 'R 468,361.67 = R 468,361.67'], ['c2', 'Customers owe what invoices say', 'Receivables = 7 unpaid invoices'], ['c3', 'Stock matches the stock account', 'R 12,448.00 = stock account'], ['c4', 'Every document is posted', 'Nothing missing from the ledger']];
const Checks: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const done = ITEMS.filter(([c]) => cue(c) >= 0).length;
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 80, right: 80, top: 250, textAlign: 'center', fontSize: 30, fontWeight: 800, letterSpacing: '.2em', color: C.blue2 }}>BOOKS HEALTH · LIVE CHECK</div>
    <Card style={{ position: 'absolute', left: 70, right: 70, top: 320, padding: '18px 44px', transform: `translateY(${(1 - sp(f)) * 200}px)`, opacity: sp(f) }}>
      {ITEMS.map(([c, t, d], i) => { const k = cue(c); const p = sp(k, { damping: 10, stiffness: 220 }); const lit = k >= 0;
        return (<div key={c} style={{ display: 'flex', gap: 28, alignItems: 'center', padding: '30px 0', borderTop: i ? `1px solid ${C.line}` : 0, position: 'relative' }}>
          <div style={{ flex: 'none', width: 76, height: 76, borderRadius: '50%', display: 'grid', placeItems: 'center', background: lit ? 'rgba(52,211,153,.18)' : 'rgba(255,255,255,.06)', border: `3px solid ${lit ? C.green : C.line}` }}>
            <Check size={44} color={C.green} strokeWidth={3.2} style={{ transform: `scale(${p})` }} /></div>
          <div style={{ opacity: 0.45 + 0.55 * Math.min(1, Math.max(0, k / 6)) }}><div style={{ fontSize: 42, fontWeight: 800 }}>{t}</div><div style={{ fontSize: 30, color: C.soft, fontWeight: 600, marginTop: 6 }}>{d}</div></div>
          {lit && k < 16 && <div style={{ position: 'absolute', inset: '0 -44px', background: `linear-gradient(90deg, transparent ${k * 7 - 30}%, rgba(52,211,153,.18) ${k * 7}%, transparent ${k * 7 + 30}%)` }} />}</div>); })}
    </Card>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1200, textAlign: 'center', fontSize: 52, fontWeight: 800, color: done === 4 ? C.green : C.soft }}>{done} of 4 verified {done === 4 ? '✓' : ''}</div>
  </AbsoluteFill>);
};

const Flag: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const a = cue('show'), w = cue('where');
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 80, right: 80, top: 270, textAlign: 'center', fontSize: 30, fontWeight: 800, letterSpacing: '.2em', color: C.amber }}>SOMETHING'S OFF?</div>
    <Card style={{ position: 'absolute', left: 70, right: 70, top: 360, padding: '40px 44px', borderColor: 'rgba(251,191,36,.6)', background: 'rgba(251,191,36,.08)', transform: `${shake(a, 16, 12)} scale(${0.8 + 0.2 * sp(a)})`, opacity: Math.min(1, Math.max(0, (a + 2) / 6)) }}>
      <div style={{ display: 'flex', gap: 26 }}><AlertTriangle size={76} color={C.amber} style={{ flex: 'none' }} />
        <div><div style={{ fontSize: 44, fontWeight: 800 }}>Customers owe what the ledger says?</div>
          <div style={{ fontSize: 34, color: C.soft, marginTop: 16, lineHeight: 1.4 }}>Receivables are <span style={{ color: C.amber, fontWeight: 800, display: 'inline-block', margin: '0 10px', transform: `scale(${1 + 0.25 * Math.max(0, Math.sin(Math.min(Math.PI, Math.max(0, w) / 8)))})` }}>R 100.00</span> more than the unpaid invoices.</div></div></div></Card>
    {w >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 820, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: Math.min(1, w / 5) }}>
      <ArrowDown size={90} color={C.amber} style={{ transform: `translateY(${Math.sin(f / 4) * 12}px)` }} />
      <Card style={{ padding: '30px 44px', fontSize: 40, fontWeight: 800, transform: `scale(${sp(w)})` }}>Deposit posted straight to receivables</Card></div>}
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const t = cue('title'), cta = cue('cta');
  const ring = 0.4 + 0.6 * Math.abs(Math.sin(f / 9));
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', fontSize: 92, fontWeight: 800, letterSpacing: '-.04em', color: '#fff', transform: `scale(${1.3 - 0.3 * sp(t)})`, opacity: Math.min(1, Math.max(0, t / 5)) }}>Books you can <span style={{ color: C.green }}>prove.</span></div>
    <div style={{ transform: `translateY(${(1 - sp(f - 4)) * 500}px)` }}>
      <Phone src="img/dashboard-phone.png" x={240} y={380} w={600} h={780}>
        <div style={{ position: 'absolute', left: 14, right: 14, top: 342, height: 92, borderRadius: 24, border: `5px solid ${C.green}`, opacity: ring, boxShadow: `0 0 40px rgba(52,211,153,${ring * 0.6})` }} /></Phone></div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1215, display: 'flex', justifyContent: 'center', transform: `scale(${cta >= 0 ? sp(cta) * (1 + 0.03 * Math.sin(f / 5)) : 0})` }}>
      <Btn><ShieldCheck size={48} />Try it free · 14 days</Btn></div>
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, answer: Answer, checks: Checks, flag: Flag, end: End } as const;
const ENTER = { answer: 'wipe', checks: 'slide', flag: 'zoom', end: 'wipe' } as const;
export const Proof: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).proof; const { fps } = useVideoConfig(); const f = useCurrentFrame(); const endStart = Math.round(v.scenes[v.scenes.length - 1].start * fps);
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter={i === 0 ? 'none' : ENTER[s.id as keyof typeof ENTER]}><Comp s={s} /></SceneShell></Sequence>; })}
    <Brand hidden={f >= endStart} /><Captions video={v} /><Audio src={staticFile('audio/proof.wav')} />
  </AbsoluteFill>);
};
