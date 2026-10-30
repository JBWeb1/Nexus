// "Picture your business": an aspirational 9:16 film. The viewer imagines the business they want, then meets Nexus.
// Night sky with drifting light, soft glowing words, scenes dissolving into each other, a sunrise at the turn.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Check, ShieldCheck, Heart, Coffee, Users, ArrowRight, Sun, FileText } from 'lucide-react';
import TL from './timeline.json';
import { FONT, ease, fontFace, useSpring, type Scene, type Video } from './lib';
import { Draw, GRAD, Ring, Words } from './mg';

const useAt = (s: Scene) => { const { fps } = useVideoConfig(); return (n: string) => Math.round((s.cues[n] - s.start) * fps); };
const GLOW = '0 0 40px rgba(125,180,255,.55)';

/** Night sky that warms towards sunrise as `warm` goes 0 → 1; light particles drift upwards. */
const Sky: React.FC<{ warm: number }> = ({ warm }) => {
  const f = useCurrentFrame();
  return (<AbsoluteFill style={{ background: 'linear-gradient(180deg,#060a24 0%,#0d1240 45%,#1c0f45 100%)', overflow: 'hidden' }}>
    <AbsoluteFill style={{ background: 'linear-gradient(180deg,#1e1b4b 0%,#7c2d92 45%,#f97316 85%,#fbbf24 100%)', opacity: warm }} />
    <div style={{ position: 'absolute', width: 1400, height: 1400, left: -160 + Math.sin(f / 90) * 120, top: 300 + Math.cos(f / 110) * 100, background: `radial-gradient(closest-side, rgba(${warm > 0.5 ? '251,191,36' : '96,165,250'},.28), transparent)` }} />
    <div style={{ position: 'absolute', width: 1100, height: 1100, left: 300 + Math.cos(f / 80) * 140, top: -300, background: 'radial-gradient(closest-side, rgba(167,139,250,.22), transparent)' }} />
    {Array.from({ length: 70 }).map((_, i) => { const x = random(`px${i}`) * 1080, sp = 0.4 + random(`ps${i}`) * 1.4, y = ((random(`py${i}`) * 2200 - f * sp) % 2200 + 2200) % 2200 - 140;
      const s = 2 + random(`pz${i}`) * 5, tw = 0.35 + 0.65 * Math.abs(Math.sin(f / (12 + random(`pt${i}`) * 30) + i));
      return <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: warm > 0.5 ? '#fde68a' : '#c7d2fe', opacity: tw * 0.8, boxShadow: `0 0 ${s * 3}px ${warm > 0.5 ? '#fbbf24' : '#93c5fd'}` }} />; })}
  </AbsoluteFill>);
};

const Glass: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 34, boxShadow: '0 30px 80px -20px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.15)', fontFamily: FONT, color: '#fff', ...style }}>{children}</div>);
const Line: React.FC<{ k: number; text: string; top: number; size?: number; accent?: Record<number, React.CSSProperties> }> = ({ k, text, top, size = 92, accent }) =>
  k < 0 ? null : <div style={{ position: 'absolute', left: 60, right: 60, top, textShadow: GLOW }}><Words text={text} k={k} size={size} stagger={3} accent={accent} /></div>;

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const p = at('picture'), y = at('year');
  const lid = f < p ? ease(f, at('close') + 18, p - 2) : 1 - ease(f, p, p + 16); // eyes close, then open on "picture"
  return (<AbsoluteFill>
    {f < p + 4 && <div style={{ opacity: 1 - ease(f, p - 6, p + 2) }}><Line k={f - at('close')} text="Close your eyes." top={760} size={110} accent={{ 2: GRAD }} /></div>}
    <Line k={f - p} text="Picture your business" top={520} size={96} accent={{ 2: GRAD }} />
    {y >= -2 && <><Ring k={f - y} r={300} x={540} y={1120} stroke="rgba(147,197,253,.6)" width={4} dur={30} rotate={f * 0.8} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 960, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 260, letterSpacing: '-.05em', textShadow: GLOW, transform: `scale(${sp(f - y, { damping: 12 })})` }}><span style={GRAD}>2027</span></div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1290, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 48, color: '#c7d2fe', opacity: ease(f - y, 8, 18) }}>one year from now</div></>}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 960 * lid, background: '#02030c' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 960 * lid, background: '#02030c' }} />
  </AbsoluteFill>);
};

const Paid: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const i0 = at('inv'), ev = at('every');
  const cards: [string, string, number, number][] = [['INV-0041', 'R 3,105.00', 150, -5], ['INV-0042', 'R 9,936.00', 0, 3], ['INV-0043', 'R 15,525.00', -150, -2]];
  return (<AbsoluteFill>
    <Line k={f - i0} text="Invoices, paid on time." top={330} size={92} accent={{ 2: GRAD, 3: GRAD }} />
    {cards.map(([n, a, dx, r], i) => { const q = sp(f - i0 - 6 - i * 6, { damping: 14 }); const stamp = f - i0 - 22 - i * 10; const float = Math.sin(f / 30 + i) * 12;
      return (<div key={n} style={{ position: 'absolute', left: 190 + dx * 0.3, top: 760 + i * 230 + float, width: 700, transform: `translateY(${(1 - q) * 400}px) rotate(${r}deg)`, opacity: q }}>
        <Glass style={{ padding: '34px 40px', display: 'flex', alignItems: 'center', gap: 26 }}>
          <FileText size={52} color="#93c5fd" /><div style={{ flex: 1 }}><div style={{ fontSize: 36, fontWeight: 800 }}>{n}</div><div style={{ fontSize: 30, color: '#c7d2fe', fontWeight: 600 }}>{a}</div></div>
          {stamp >= 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 14, border: '4px solid #34d399', color: '#34d399', fontSize: 30, fontWeight: 800, transform: `scale(${2 - sp(stamp, { damping: 9 })}) rotate(-6deg)`, boxShadow: '0 0 30px rgba(52,211,153,.5)' }}><Check size={30} strokeWidth={3.4} />PAID</div>}
        </Glass></div>); })}
    <Line k={f - ev} text="Every time." top={1520} size={84} accent={{ 1: { color: '#6ee7b7' } }} />
  </AbsoluteFill>);
};

const Month: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const m = at('me'), a = at('aft'), n = at('not');
  const t = ease(f - m, 0, a + 20 - m) * 0.62; const sx = 540 - Math.cos(Math.PI * t) * 400, sy = 1180 - Math.sin(Math.PI * t) * 400;
  return (<AbsoluteFill>
    <Line k={f - m} text="Month end," top={300} size={110} />
    <Line k={f - a} text="done in an afternoon." top={440} size={80} accent={{ 3: GRAD }} />
    <Draw k={f - m} dur={30} size={[1080, 1920]} len={1400} stroke="rgba(253,230,138,.5)" width={4} d="M140 1180 A400 400 0 0 1 940 1180" style={{ left: 0, top: 0 }} />
    <div style={{ position: 'absolute', left: 120, right: 120, top: 1180, height: 3, background: 'rgba(255,255,255,.25)' }} />
    <div style={{ position: 'absolute', left: sx - 70, top: sy - 70, width: 140, height: 140, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle,#fde68a,#f59e0b)', boxShadow: '0 0 80px #fbbf24', transform: `scale(${sp(f - m)})` }}><Sun size={70} color="#7c2d12" /></div>
    {f >= a && <div style={{ position: 'absolute', left: 0, right: 0, top: 1230, textAlign: 'center', fontFamily: FONT, fontSize: 44, fontWeight: 800, color: '#fde68a', opacity: ease(f - a, 0, 10) }}>15:00 · all done</div>}
    {f >= n && <div style={{ position: 'absolute', left: 0, right: 0, top: 1420, display: 'flex', justifyContent: 'center', gap: 22 }}>
      {['Saturday', 'Sunday'].map((d, i) => { const q = sp(f - n - i * 4); return <Glass key={d} style={{ position: 'relative', padding: '22px 36px', fontSize: 40, fontWeight: 800, transform: `scale(${q})`, opacity: q }}>{d}
        <div style={{ position: 'absolute', left: 20, top: '50%', height: 6, borderRadius: 3, background: '#f87171', width: `${ease(f - n - 8 - i * 4, 0, 10) * 85}%` }} /></Glass>; })}</div>}
    {f >= n && <div style={{ position: 'absolute', left: 0, right: 0, top: 1580, textAlign: 'center', fontFamily: FONT, fontSize: 56, fontWeight: 800, color: '#fff', opacity: ease(f - n, 6, 16) }}>Not a weekend.</div>}
  </AbsoluteFill>);
};

const Clear: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring();
  const pills: [string, string, number][] = [['b1', 'Books checked', 640], ['b2', 'VAT ready', 1360], ['b3', 'Numbers clear', 1520]];
  return (<AbsoluteFill>
    <Ring k={f} r={230} x={540} y={1000} stroke="rgba(110,231,183,.7)" width={6} dur={40} rotate={f * 0.6} />
    <Ring k={f - 8} r={290} x={540} y={1000} stroke="rgba(147,197,253,.35)" width={2} dur={40} rotate={-f * 0.4} />
    <div style={{ position: 'absolute', left: 540 - 130, top: 1000 - 130, transform: `scale(${sp(f - 4, { damping: 11 })})`, filter: 'drop-shadow(0 0 40px rgba(52,211,153,.7))' }}><ShieldCheck size={260} color="#6ee7b7" strokeWidth={1.4} /></div>
    <Line k={f - 4} text="Clear books." top={300} size={110} accent={{ 1: GRAD }} />
    {pills.map(([c, t, top], i) => { const k = f - at(c); if (k < 0) return null; const q = sp(k, { damping: 12 });
      return <div key={c} style={{ position: 'absolute', left: 0, right: 0, top: i === 0 ? top : top, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - q) * 60}px)`, opacity: q }}>
        <Glass style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 36px', fontSize: 46, fontWeight: 800, borderRadius: 999 }}><div style={{ width: 54, height: 54, borderRadius: '50%', background: '#34d399', display: 'grid', placeItems: 'center' }}><Check size={34} color="#052e16" strokeWidth={3.4} /></div>{t}</Glass></div>; })}
  </AbsoluteFill>);
};

const Love: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const w = at('work'), p = at('people');
  const icons: [React.ReactNode, number, number, number][] = [[<Coffee size={110} color="#fff" />, 230, 980, w], [<Heart size={130} color="#fff" fill="#fb7185" />, 540, 900, p], [<Users size={110} color="#fff" />, 850, 980, p + 6]];
  return (<AbsoluteFill>
    <Line k={f - 4} text="More time for" top={300} size={100} />
    <Line k={f - w} text="the work you love," top={440} size={80} accent={{ 1: { color: '#fde68a' } }} />
    <Line k={f - p} text="and the people you love." top={560} size={72} accent={{ 2: { color: '#fbcfe8' } }} />
    {icons.map(([ic, x, y, k], i) => { const q = k <= f ? sp(f - k, { damping: 10 }) : 0;
      return <div key={i} style={{ position: 'absolute', left: x - 110, top: y - 110 + Math.sin(f / 25 + i) * 18, width: 220, height: 220, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', boxShadow: '0 0 60px rgba(251,191,36,.45)', transform: `scale(${q})` }}>{ic}</div>; })}
  </AbsoluteFill>);
};

const One: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const o = at('one'); const pulse = 1 + 0.15 * Math.sin(f / 6);
  return (<AbsoluteFill>
    <AbsoluteFill style={{ background: '#02030c', opacity: 0.55 * ease(f, 0, 20) }} />
    <Line k={f - 2} text="That business starts with" top={560} size={74} />
    <Line k={f - o} text="one decision." top={700} size={120} accent={{ 0: GRAD, 1: GRAD }} />
    <div style={{ position: 'absolute', left: 540 - 22, top: 1180 - 22, width: 44, height: 44, borderRadius: '50%', background: '#fff', boxShadow: `0 0 ${60 * pulse}px #93c5fd, 0 0 ${140 * pulse}px #60a5fa`, transform: `scale(${pulse * ease(f, 4, 20)})` }} />
  </AbsoluteFill>);
};

const Brand: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const b = at('brand'), w = at('works'), g = at('grow');
  return (<AbsoluteFill>
    <Ring k={f - b} r={420} x={540} y={800} stroke="rgba(147,197,253,.8)" width={6} dur={18} />
    <div style={{ position: 'absolute', width: 1200, height: 1200, left: -60, top: 200, background: 'radial-gradient(closest-side, rgba(37,99,235,.45), transparent)', transform: `scale(${sp(f - b)})` }} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center', transform: `scale(${sp(f - b, { damping: 11 })})`, filter: 'drop-shadow(0 0 40px rgba(59,130,246,.8))' }}><Img src={staticFile('img/logo-social.png')} style={{ width: 760 }} /></div>
    <Line k={f - w} text="Accounting that works for you," top={1220} size={66} accent={{ 3: GRAD, 4: GRAD }} />
    <Line k={f - g} text="so you can grow." top={1330} size={90} accent={{ 3: { color: '#6ee7b7' } }} />
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const fr = at('free'), st = at('step');
  return (<AbsoluteFill>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 220, display: 'flex', justifyContent: 'center', opacity: ease(f, 0, 14) }}><Img src={staticFile('img/logo-social.png')} style={{ width: 420 }} /></div>
    <Line k={f - fr} text="Start your 14-day free trial" top={700} size={72} accent={{ 2: GRAD, 3: GRAD, 4: GRAD }} />
    {f >= fr + 10 && <div style={{ position: 'absolute', left: 0, right: 0, top: 900, display: 'flex', justifyContent: 'center', transform: `scale(${sp(f - fr - 10) * (1 + 0.03 * Math.sin(f / 7))})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '34px 64px', borderRadius: 999, background: 'linear-gradient(90deg,#2563eb,#06b6d4)', fontFamily: FONT, fontSize: 52, fontWeight: 800, color: '#fff', boxShadow: '0 0 70px rgba(59,130,246,.7)' }}>Start free today<ArrowRight size={56} /></div></div>}
    <Line k={f - st} text="Step into it." top={1240} size={130} accent={{ 2: GRAD }} />
    {f >= st && Array.from({ length: 16 }).map((_, i) => { const a = (i / 16) * Math.PI * 2, d = ease(f - st, 0, 30) * 460; return <div key={i} style={{ position: 'absolute', left: 540 + Math.cos(a) * d, top: 1310 + Math.sin(a) * d * 0.6, width: 10, height: 10, borderRadius: '50%', background: '#fde68a', boxShadow: '0 0 16px #fbbf24', opacity: 1 - ease(f - st, 18, 34) }} />; })}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1560, textAlign: 'center', fontFamily: FONT, fontSize: 36, fontWeight: 700, color: '#c7d2fe', opacity: ease(f - st, 14, 26) }}>No card needed · Built for South Africa</div>
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, paid: Paid, month: Month, clear: Clear, love: Love, one: One, brand: Brand, end: End } as const;
const WARM: Record<string, number> = { love: 1, one: 0.35 };
export const VisionFilm: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).vision; const { fps } = useVideoConfig();
  return (<AbsoluteFill style={{ background: '#060a24' }}><style>{fontFace}</style>
    {v.scenes.map((s) => { const Comp = SCENES[s.id as keyof typeof SCENES];
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={Math.round(s.dur * fps) + 16}><Dissolve><Sky warm={WARM[s.id] ?? 0} /><Comp s={s} /></Dissolve></Sequence>; })}
    <Audio src={staticFile('audio/vision.wav')} />
  </AbsoluteFill>);
};
/** Each scene fades in over the one before it. */
const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => { const f = useCurrentFrame(); return <AbsoluteFill style={{ opacity: ease(f, 0, 16) }}>{children}</AbsoluteFill>; };
