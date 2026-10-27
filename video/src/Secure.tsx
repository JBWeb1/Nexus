// "Your data, locked down": hook on someone quietly editing last month's invoice; the database refuses.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Lock, ShieldCheck, ArrowDown, Download, FileJson, Users, Pencil, CalendarDays, Undo2 } from 'lucide-react';
import TL from './timeline.json';
import { Brand, Btn, C, Captions, Card, FONT, Phone, SceneShell, ease, fontFace, shake, useSpring, type Scene, type Video } from './lib';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };
const Kicker: React.FC<{ children: React.ReactNode; color?: string; top?: number }> = ({ children, color = C.blue2, top = 260 }) => (
  <div style={{ position: 'absolute', left: 60, right: 60, top, textAlign: 'center', fontSize: 30, fontWeight: 800, letterSpacing: '.2em', color, fontFamily: FONT }}>{children}</div>);

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const e = cue('edit'), b = cue('block');
  // The amount is edited key by key: delete to "R 1", then type "472.00". Snaps back when the database refuses.
  const orig = 'R 14,720.00', steps = ['R 14,720.00', 'R 14,720.0', 'R 14,720.', 'R 14,720', 'R 14,72', 'R 14,7', 'R 14,', 'R 14', 'R 1', 'R 1,', 'R 1,4', 'R 1,47', 'R 1,472', 'R 1,472.', 'R 1,472.0', 'R 1,472.00'];
  const shown = b >= 0 ? orig : e >= 0 ? steps[Math.min(steps.length - 1, Math.floor(e / 1.6))] : orig;
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <Kicker top={250}>LAST MONTH'S INVOICE</Kicker>
    <Card style={{ position: 'absolute', left: 70, right: 70, top: 340, padding: '50px 50px 56px', transform: `${shake(b, 30, 16)} scale(${0.9 + 0.1 * sp(f)})`, borderColor: b >= 0 ? 'rgba(248,113,113,.7)' : C.line }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 40, fontWeight: 800 }}><span>INV-0012</span><span style={{ color: C.soft, fontSize: 32 }}>Hotel Breede</span></div>
      <div style={{ fontSize: 30, color: C.soft, marginTop: 10 }}>Posted 12 September 2026</div>
      <div style={{ marginTop: 50, fontSize: 130, fontWeight: 800, letterSpacing: '-.04em', color: b >= 0 ? '#fff' : e >= 0 ? C.amber : '#fff', display: 'flex', alignItems: 'center' }}>{shown}
        {e >= 0 && b < 0 && <span style={{ display: 'inline-block', width: 8, height: 120, marginLeft: 8, background: C.amber, opacity: Math.floor(f / 8) % 2 ? 1 : 0.2 }} />}
        {b >= 0 && <Lock size={90} color={C.soft} style={{ marginLeft: 26, transform: `scale(${sp(b)})` }} />}</div>
    </Card>
    {b >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 960, display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: '26px 54px', borderRadius: 22, border: `7px solid ${C.red}`, color: C.red, fontSize: 92, fontWeight: 800, letterSpacing: '.06em', background: 'rgba(248,113,113,.12)', transform: `scale(${2.2 - 1.2 * sp(b, { damping: 9, stiffness: 240 })}) rotate(-6deg)`, opacity: Math.min(1, b / 3) }}>BLOCKED</div></div>}
  </AbsoluteFill>);
};

const Answer: React.FC<{ s: Scene }> = ({ s }) => {
  const cue = useCue(s); const sp = useSpring(); const n = cue('not'), r = cue('refuse'), v = cue('rev');
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center', fontSize: 120, fontWeight: 800, letterSpacing: '-.04em', color: '#fff', transform: `scale(${1.4 - 0.4 * sp(n)})`, opacity: Math.min(1, Math.max(0, n / 4)) }}>Not in <span style={{ color: C.green }}>Nexus.</span></div>
    {r >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center', transform: `scale(${sp(r)})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 34px', borderRadius: 999, background: 'rgba(52,211,153,.12)', border: `2px solid rgba(52,211,153,.5)`, fontSize: 38, fontWeight: 800 }}><ShieldCheck size={44} color={C.green} />The database refuses the edit</div></div>}
    <Card style={{ position: 'absolute', left: 70, right: 70, top: 640, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '30px 30px', fontSize: 38, fontWeight: 700 }}><span>INV-0012 · Sales</span><span>R 14,720.00</span></div>
      {v >= 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px', borderRadius: 24, background: 'rgba(124,179,255,.12)', border: '1px solid rgba(124,179,255,.45)', fontSize: 38, fontWeight: 700, transform: `translateY(${(1 - sp(v)) * -80}px)`, opacity: Math.min(1, v / 5) }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}><Undo2 size={40} color={C.blue2} />Reversal of INV-0012</span><span>−R 14,720.00</span></div>}
      {v >= 0 && <div style={{ padding: '18px 30px 10px', fontSize: 30, color: C.blue2, fontWeight: 700, opacity: Math.min(1, Math.max(0, (v - 8) / 6)) }}>Visible to everyone · who did it and when</div>}
    </Card>
  </AbsoluteFill>);
};

const Walls: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const w = cue('wall'), d = cue('db');
  const names = ['Karoo Coffee Roasters', 'Paarl Bakery', 'Cape Gear Hire'];
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <Kicker>ONE COMPANY CAN'T SEE ANOTHER</Kicker>
    {names.map((nm, i) => { const p = sp(f - i * 5, { damping: 11 }); return (<React.Fragment key={nm}>
      <Card style={{ position: 'absolute', left: 90, right: 90, top: 360 + i * 250, padding: '40px', textAlign: 'center', fontSize: 50, fontWeight: 800, transform: `translateX(${(1 - p) * (i % 2 ? 900 : -900)}px)` }}>{nm}</Card>
      {i < 2 && <div style={{ position: 'absolute', left: 90, top: 360 + i * 250 + 180, height: 18, width: 900 * ease(w - i * 3, 0, 12), borderRadius: 9, background: 'linear-gradient(90deg,#34d399,#67e8f9)', boxShadow: '0 0 40px rgba(52,211,153,.7)' }} />}</React.Fragment>); })}
    {d >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 1160, display: 'flex', justifyContent: 'center', transform: `scale(${sp(d)})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 36px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${C.line}`, fontSize: 38, fontWeight: 800 }}><ShieldCheck size={44} color={C.green} />Separated inside the database</div></div>}
  </AbsoluteFill>);
};

const Pw: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const h = cue('hash'), t = cue('twofa'), c = cue('code');
  const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; const dots = Math.min(10, Math.floor(f / 3));
  const slide = t >= 0 ? sp(t, { damping: 13 }) : 0;
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ transform: `translateY(${-slide * 260}px)`, opacity: 1 - slide }}>
      <Kicker>YOUR PASSWORD</Kicker>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 340, height: 130, borderRadius: 30, background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', padding: '0 44px', fontSize: 72, fontWeight: 800, letterSpacing: '.22em' }}>{'•'.repeat(dots)}</div>
      {h >= 0 && <><div style={{ position: 'absolute', left: 0, right: 0, top: 500, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - sp(h)) * -40}px)`, opacity: Math.min(1, h / 4) }}><ArrowDown size={90} color={C.blue2} /></div>
        <Card style={{ position: 'absolute', left: 90, right: 90, top: 620, padding: '36px 40px', fontSize: 38, color: '#a7f3d0', fontFamily: 'ui-monospace, DejaVu Sans Mono, monospace', wordBreak: 'break-all', lineHeight: 1.35 }}>{hash.slice(0, Math.floor(Math.max(0, h) * 1.6))}</Card></>}
    </div>
    {t >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translateY(${(1 - slide) * 900}px)` }}>
      <div style={{ width: 560, height: 700, borderRadius: 70, padding: 20, background: '#0b1220', boxShadow: '0 40px 120px rgba(0,0,0,.7), 0 0 0 3px rgba(255,255,255,.14)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 52, background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#cbd5e1' }}>Nexus Ledger</div>
          <div style={{ fontSize: 100, fontWeight: 800, letterSpacing: '.08em', color: '#fff', fontFamily: 'ui-monospace, DejaVu Sans Mono, monospace', transform: c >= 0 && c < 8 ? `rotateX(${(1 - c / 8) * 90}deg)` : 'none' }}>{c >= 0 ? '507 268' : '482 913'}</div>
          <svg width="120" height="120" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="4" /><circle cx="20" cy="20" r="16" fill="none" stroke={C.green} strokeWidth="4" strokeLinecap="round" transform="rotate(-90 20 20)" strokeDasharray={100.5} strokeDashoffset={100.5 * ((Math.max(0, t) % 90) / 90)} /></svg></div></div></div>}
  </AbsoluteFill>);
};

const Log: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring();
  const chips: [string, React.ReactNode, string][] = [['who', <Users size={40} color={C.blue2} />, 'Who'], ['what', <Pencil size={40} color={C.blue2} />, 'What'], ['when', <CalendarDays size={40} color={C.blue2} />, 'When']];
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ transform: `translateY(${(1 - sp(f)) * 700}px)` }}><Phone src="img/activity-phone.png" x={240} y={230} w={600} h={1000} scroll={200} frames={Math.round(s.dur * 30)} local={f} /></div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1260, display: 'flex', justifyContent: 'center', gap: 22 }}>
      {chips.map(([c, ic, label]) => { const k = cue(c); return <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 30px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${C.line}`, fontSize: 38, fontWeight: 800, transform: `scale(${k >= 0 ? sp(k) : 0})` }}>{ic}{label}</div>; })}</div>
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const y = cue('yours'), d = cue('dl'), b = cue('brand');
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 300, transform: `translateY(${Math.abs(Math.sin(f / 8)) * -30}px) scale(${sp(f)})` }}><Download size={220} color={C.green} strokeWidth={1.8} /></div>
    <div style={{ position: 'absolute', top: 600, fontSize: 108, fontWeight: 800, letterSpacing: '-.04em', color: '#fff', transform: `scale(${1.3 - 0.3 * sp(y)})`, opacity: Math.min(1, Math.max(0, y / 4)) }}>Your data is <span style={{ color: C.green }}>yours.</span></div>
    {d >= 0 && <div style={{ position: 'absolute', top: 790, display: 'flex', alignItems: 'center', gap: 16, padding: '22px 36px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${C.line}`, fontSize: 40, fontWeight: 800, transform: `scale(${sp(d)})` }}><FileJson size={46} color={C.green} />Download all of it, any time</div>}
    {b >= 0 && <div style={{ position: 'absolute', top: 1090, transform: `scale(${sp(b) * (1 + 0.03 * Math.sin(f / 5))})` }}><Btn><ShieldCheck size={48} />Nexus Ledger · try it free</Btn></div>}
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, answer: Answer, walls: Walls, pw: Pw, log: Log, end: End } as const;
const ENTER = { answer: 'wipe', walls: 'slide', pw: 'zoom', log: 'wipe', end: 'zoom' } as const;
export const Secure: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).secure; const { fps } = useVideoConfig(); const f = useCurrentFrame(); const endStart = Math.round(v.scenes[v.scenes.length - 1].start * fps);
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter={i === 0 ? 'none' : ENTER[s.id as keyof typeof ENTER]}><Comp s={s} /></SceneShell></Sequence>; })}
    <Brand hidden={f >= endStart} /><Captions video={v} /><Audio src={staticFile('audio/secure.wav')} />
  </AbsoluteFill>);
};
