// "Get paid without chasing": hook on the follow-up messages nobody answers; Nexus sends the reminders and the customer pays online.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BellRing, Mail, Paperclip, MessageCircle, CheckCheck, Check, ShieldCheck, CreditCard, Hand } from 'lucide-react';
import TL from './timeline.json';
import { Brand, Btn, C, Captions, Card, FONT, SceneShell, ease, fontFace, shake, useSpring, type Scene, type Video } from './lib';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };
const Kicker: React.FC<{ children: React.ReactNode; color?: string; top?: number }> = ({ children, color = C.blue2, top = 260 }) => (
  <div style={{ position: 'absolute', left: 60, right: 60, top, textAlign: 'center', fontSize: 30, fontWeight: 800, letterSpacing: '.2em', color, fontFamily: FONT }}>{children}</div>);
const Bubble: React.FC<{ children: React.ReactNode; p: number; time: string; style?: React.CSSProperties }> = ({ children, p, time, style }) => (
  <div style={{ alignSelf: 'flex-end', maxWidth: 760, padding: '24px 30px 16px', borderRadius: '34px 34px 8px 34px', background: '#1f6f54', fontSize: 38, fontWeight: 600, lineHeight: 1.3, transform: `scale(${p})`, transformOrigin: '100% 100%', opacity: p, ...style }}>
    {children}<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, fontSize: 24, color: 'rgba(255,255,255,.6)', marginTop: 6 }}>{time}<CheckCheck size={28} color="#7cb3ff" /></div></div>);

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const m = cue('msgs'), a = cue('again');
  const msgs: [string, string][] = [['Hi Sam, just following up on invoice INV-0042 🙏', 'Mon 09:12'], ['Hi again, any news on the payment?', 'Thu 16:40'], ['Sorry to bother you… 😅', 'Tue 08:05']];
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 80, right: 80, top: 240, display: 'flex', flexDirection: 'column', gap: 26, transform: shake(a, 26, 16) }}>
      {msgs.map(([t, time], i) => <Bubble key={i} p={sp(m + 10 - i * 9, { damping: 13, stiffness: 220 })} time={time}>{t}</Bubble>)}
      <div style={{ alignSelf: 'center', fontSize: 28, fontWeight: 700, color: C.soft, opacity: ease(m, 22, 30), marginTop: 6 }}>Seen · no reply</div>
    </div>
    {a >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 960, display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: '22px 50px', borderRadius: 22, border: `7px solid ${C.red}`, color: C.red, fontSize: 84, fontWeight: 800, background: 'rgba(248,113,113,.12)', transform: `scale(${2.2 - 1.2 * sp(a, { damping: 9, stiffness: 240 })}) rotate(-5deg)`, opacity: Math.min(1, a / 3) }}>47 DAYS OVERDUE</div></div>}
  </AbsoluteFill>);
};

const Answer: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const n = cue('nexus'), y = cue('you');
  const ring = Math.sin(f * 0.9) * 18 * Math.max(0, 1 - Math.max(0, f - 20) / 40);
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 400, transform: `scale(${sp(n + 3)}) rotate(${ring}deg)`, transformOrigin: '50% 10%' }}><BellRing size={300} color={C.amber} strokeWidth={1.6} /></div>
    <div style={{ position: 'absolute', top: 820, left: 60, right: 60, textAlign: 'center', fontSize: 100, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.08 }}>
      {['Let', 'Nexus', 'do', 'the', 'chasing.'].map((w, i) => { const k = n + 2 - i * 3; const p = sp(k, { damping: 12 }); return <span key={i} style={{ display: 'inline-block', margin: '0 12px', opacity: k >= 0 ? 1 : 0, transform: `translateY(${(1 - p) * 60}px)`, color: i === 1 ? C.cyan : i === 4 && y >= 0 ? C.green : '#fff' }}>{w}</span>; })}</div>
  </AbsoluteFill>);
};

const Schedule: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring();
  const rows: [string, string, string, string][] = [['d1', '3 days before', 'A friendly reminder', C.blue2], ['d2', 'On the due date', 'Due today', C.cyan], ['d3', '7 days late', 'Now overdue', C.amber], ['d4', '30 days late', 'Final reminder', C.red]];
  const lit = rows.filter(([c]) => cue(c) >= 0).length; const line = lit ? Math.max(0, (lit - 2 + ease(cue(rows[lit - 1][0]), 0, 10)) / 3) : 0; // reaches row i when it lights up
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <Kicker top={240}>AUTOMATIC REMINDERS</Kicker>
    <div style={{ position: 'absolute', left: 168, top: 380, width: 8, height: 750, borderRadius: 4, background: 'rgba(255,255,255,.1)' }} />
    <div style={{ position: 'absolute', left: 168, top: 380, width: 8, height: 750 * Math.min(1, line), borderRadius: 4, background: 'linear-gradient(#7cb3ff,#34d399)', boxShadow: '0 0 30px rgba(52,211,153,.6)' }} />
    {rows.map(([c, when, what, col], i) => { const k = cue(c); const p = k >= 0 ? sp(k, { damping: 11, stiffness: 220 }) : 0; const intro = sp(f - i * 4);
      return (<div key={c} style={{ position: 'absolute', left: 120, right: 80, top: 330 + i * 250, display: 'flex', alignItems: 'center', gap: 40, opacity: intro, transform: `translateX(${(1 - intro) * 400}px)` }}>
        <div style={{ flex: 'none', width: 104, height: 104, borderRadius: '50%', display: 'grid', placeItems: 'center', background: k >= 0 ? col : '#0e1a33', border: `4px solid ${k >= 0 ? col : C.line}`, boxShadow: k >= 0 ? `0 0 ${40 * p}px ${col}` : 'none' }}>
          <Mail size={50} color={k >= 0 ? '#06101f' : C.soft} style={{ transform: `scale(${0.7 + 0.3 * p})` }} /></div>
        <Card style={{ flex: 1, padding: '28px 36px', borderColor: k >= 0 ? col : C.line, transform: `scale(${0.94 + 0.06 * p})` }}>
          <div style={{ fontSize: 44, fontWeight: 800 }}>{when}</div><div style={{ fontSize: 30, fontWeight: 600, color: C.soft, marginTop: 6 }}>{what}</div></Card></div>); })}
  </AbsoluteFill>);
};

const Channels: React.FC<{ s: Scene }> = ({ s }) => {
  const cue = useCue(s); const sp = useSpring(); const e = cue('email'), p = cue('pdf'), w = cue('wa');
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <Card style={{ position: 'absolute', left: 80, right: 80, top: 250, padding: '40px 44px', background: '#f8fafc', color: '#0f172a', transform: `translateY(${(1 - sp(e + 4)) * -700}px) rotate(${(1 - sp(e + 4)) * -8}deg)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, color: '#475569', fontWeight: 700 }}><Mail size={40} color="#2563eb" />accounts@karoocoffee.co.za</div>
      <div style={{ fontSize: 44, fontWeight: 800, marginTop: 22 }}>Invoice INV-0042 is due today</div>
      <div style={{ fontSize: 30, color: '#475569', marginTop: 12, lineHeight: 1.4 }}>R 4,830.00 · pay securely with the link below.</div>
      {p >= 0 && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginTop: 26, padding: '18px 26px', borderRadius: 18, background: '#e2e8f0', fontSize: 32, fontWeight: 800, transform: `scale(${sp(p, { damping: 10 })})` }}><Paperclip size={36} color="#dc2626" />INV-0042.pdf</div>}
    </Card>
    {w >= 0 && <><div style={{ position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', fontSize: 40, fontWeight: 800, color: C.soft, opacity: ease(w, 0, 6) }}>or</div>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 840, display: 'flex', flexDirection: 'column', transform: `translateY(${(1 - sp(w)) * 600}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 32, fontWeight: 800, color: '#25d366', marginBottom: 18 }}><MessageCircle size={44} color="#25d366" />WhatsApp</div>
        <div style={{ alignSelf: 'flex-start', padding: '26px 32px', borderRadius: '8px 34px 34px 34px', background: '#1f2c34', fontSize: 36, fontWeight: 600, lineHeight: 1.35, maxWidth: 820 }}>Hi Sam, invoice INV-0042 for R 4,830.00 is due today. Tap to view and pay.</div></div></>}
  </AbsoluteFill>);
};

const Pay: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const t = cue('tap'), o = cue('owe'), p = cue('pay');
  const slide = o >= 0 ? sp(o, { damping: 15 }) : 0; const paid = p >= 6; const press = p >= 0 && p < 6 ? 0.93 : 1;
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 240, top: 240, width: 600, height: 1010, borderRadius: 74, padding: 20, background: '#0b1220', boxShadow: '0 50px 140px -30px rgba(0,0,0,.85), 0 0 0 3px rgba(255,255,255,.14)', transform: `translateY(${(1 - sp(f)) * 500}px)` }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 56, overflow: 'hidden', background: '#0b141a' }}>
        <div style={{ position: 'absolute', left: 30, right: 30, top: 120, padding: '24px 26px', borderRadius: '8px 30px 30px 30px', background: '#1f2c34', fontSize: 30, lineHeight: 1.4, fontWeight: 600 }}>
          Invoice INV-0042 for R 4,830.00 is due today.<div style={{ color: '#53bdeb', marginTop: 10, textDecoration: 'underline', background: t >= 0 && t < 10 ? 'rgba(83,189,235,.25)' : 'none', borderRadius: 8 }}>nexusledger.co.za/portal/…</div></div>
        {t >= 0 && t < 14 && <div style={{ position: 'absolute', left: 200, top: 300, width: 90, height: 90, marginLeft: -45, marginTop: -45, borderRadius: '50%', border: '4px solid #fff', opacity: 1 - t / 14, transform: `scale(${0.4 + t / 8})` }} />}
        <div style={{ position: 'absolute', inset: 0, background: '#f5f7fb', color: '#0f172a', transform: `translateX(${(1 - slide) * 100}%)`, padding: '110px 40px 40px' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#64748b' }}>Karoo Coffee Roasters</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#64748b', marginTop: 40 }}>You owe</div>
          <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: '-.04em' }}>R 4,830.00</div>
          {['INV-0042 · due today'].map((r) => <div key={r} style={{ marginTop: 26, padding: '22px 24px', borderRadius: 20, background: '#fff', border: '1px solid #e2e8f0', fontSize: 28, fontWeight: 700 }}>{r}</div>)}
          <div style={{ position: 'absolute', left: 40, right: 40, bottom: 80, height: 120, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: 40, fontWeight: 800, color: '#fff', background: paid ? '#10b981' : '#2563eb', transform: `scale(${press})` }}>
            {paid ? <><Check size={48} strokeWidth={3.2} />Paid</> : <><CreditCard size={44} />Pay now</>}</div>
          {p >= 0 && p < 10 && <Hand size={90} color="#0f172a" style={{ position: 'absolute', left: 250, bottom: 30 }} />}
        </div></div></div>
    {paid && <div style={{ position: 'absolute', left: 0, right: 0, top: 1290, display: 'flex', justifyContent: 'center', transform: `scale(${sp(p - 6)})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 34px', borderRadius: 999, background: 'rgba(52,211,153,.14)', border: '2px solid rgba(52,211,153,.5)', fontSize: 38, fontWeight: 800 }}><Check size={44} color={C.green} />Invoice marked paid</div></div>}
    {paid && Array.from({ length: 14 }).map((_, i) => { const k = p - 6; const a = (i / 14) * Math.PI * 2; const d = ease(k, 0, 18) * 380;
      return <div key={i} style={{ position: 'absolute', left: 540 + Math.cos(a) * d, top: 1080 + Math.sin(a) * d * 0.7, width: 18, height: 18, borderRadius: i % 2 ? 4 : 9, background: [C.green, C.cyan, C.amber][i % 3], opacity: 1 - ease(k, 10, 22) }} />; })}
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const t = cue('title'), b = cue('brand'), c = cue('cta');
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 330, textAlign: 'center', fontSize: 120, fontWeight: 800, letterSpacing: '-.045em', lineHeight: 1, transform: `scale(${1.3 - 0.3 * sp(t)})`, opacity: Math.min(1, Math.max(0, t / 4)) }}>Get <span style={{ color: C.green }}>paid.</span></div>
    <div style={{ position: 'absolute', top: 500, fontSize: 52, fontWeight: 700, color: C.soft, opacity: ease(t, 10, 18) }}>Without the awkward follow-ups.</div>
    {b >= 0 && <div style={{ position: 'absolute', top: 760, display: 'flex', alignItems: 'center', gap: 16, padding: '20px 34px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${C.line}`, fontSize: 40, fontWeight: 800, transform: `scale(${sp(b)})` }}><ShieldCheck size={44} color={C.green} />Nexus Ledger</div>}
    {c >= 0 && <div style={{ position: 'absolute', top: 1040, transform: `scale(${sp(c) * (1 + 0.03 * Math.sin(f / 5))})` }}><Btn><BellRing size={46} />Try it free · 14 days</Btn></div>}
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, answer: Answer, schedule: Schedule, channels: Channels, pay: Pay, end: End } as const;
const ENTER = { answer: 'wipe', schedule: 'slide', channels: 'zoom', pay: 'wipe', end: 'zoom' } as const;
export const Paid: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).paid; const { fps } = useVideoConfig(); const f = useCurrentFrame(); const endStart = Math.round(v.scenes[v.scenes.length - 1].start * fps);
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter={i === 0 ? 'none' : ENTER[s.id as keyof typeof ENTER]}><Comp s={s} /></SceneShell></Sequence>; })}
    <Brand hidden={f >= endStart} /><Captions video={v} /><Audio src={staticFile('audio/paid.wav')} />
  </AbsoluteFill>);
};
