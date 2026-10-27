// "Your accountant will love you": hook on paying for a clean-up; the accountant gets their own login, checked books and Excel exports.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Clock, ListChecks, Landmark, CalendarCheck, CheckSquare, Check, ShieldCheck, FileSpreadsheet, FolderOpen, Heart, UserRound, Sparkles } from 'lucide-react';
import TL from './timeline.json';
import { Brand, Btn, C, Captions, Card, FONT, SceneShell, ease, fontFace, glitchShadow, shake, useSpring, type Scene, type Video } from './lib';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };
const grad = { background: 'linear-gradient(90deg,#7cb3ff,#67e8f9 55%,#6ee7b7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as const;

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const ch = cue('charge'), m = cue('messy');
  const hours = Math.floor(ease(ch, 0, 40) * 14);
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <Card style={{ position: 'absolute', left: 100, right: 100, top: 300, padding: '44px 46px', transform: `${shake(m, 26, 16)} scale(${0.9 + 0.1 * sp(f)})`, borderColor: m >= 0 ? 'rgba(248,113,113,.7)' : C.line }}>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '.16em', color: C.soft }}>ACCOUNTANT'S INVOICE</div>
      <div style={{ fontSize: 46, fontWeight: 800, marginTop: 18 }}>Bookkeeping clean-up</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 34 }}>
        <Clock size={90} color={C.amber} style={{ transform: `rotate(${f * 12}deg)` }} />
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: '-.04em', color: m >= 0 ? C.red : '#fff', textShadow: glitchShadow(m, 24) }}>{hours} hrs</div></div>
      <div style={{ fontSize: 34, fontWeight: 700, color: C.soft, marginTop: 12 }}>Unmatched bank lines, missing slips, drafts…</div>
    </Card>
    {m >= 0 && <div style={{ position: 'absolute', top: 960, fontSize: 108, fontWeight: 800, letterSpacing: '-.04em', transform: `scale(${1.6 - 0.6 * sp(m, { damping: 10 })})`, opacity: Math.min(1, m / 3) }}>Messy <span style={{ color: C.red }}>books?</span></div>}
  </AbsoluteFill>);
};

const Clean: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const o = cue('open');
  const sweep = ease(o, 0, 18) * 140 - 20;
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 290, textAlign: 'center', fontSize: 104, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.05, transform: `scale(${1.2 - 0.2 * sp(f)})`, opacity: ease(f, 0, 6) }}>They open<br /><span style={grad}>clean books.</span></div>
    <Card style={{ position: 'absolute', left: 110, right: 110, top: 640, padding: '20px 40px', overflow: 'hidden', transform: `translateY(${(1 - sp(f - 4)) * 400}px)` }}>
      {[['Bank lines matched', '100%'], ['Draft documents', '0'], ['Unexplained balances', '0'], ['VAT period', 'Ready']].map(([a, b], i) => (
        <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '26px 0', borderTop: i ? `1px solid ${C.line}` : 0, fontSize: 38, fontWeight: 700 }}><span>{a}</span><span style={{ color: C.green, fontWeight: 800 }}>{b}</span></div>))}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(100deg, transparent ${sweep - 15}%, rgba(255,255,255,.18) ${sweep}%, transparent ${sweep + 15}%)` }} />
    </Card>
    {o >= 0 && <div style={{ position: 'absolute', top: 600, right: 120, transform: `scale(${sp(o - 4)}) rotate(${f * 2}deg)` }}><Sparkles size={80} color={C.cyan} /></div>}
  </AbsoluteFill>);
};

const View: React.FC<{ s: Scene }> = ({ s }) => {
  const cue = useCue(s); const sp = useSpring(); const l = cue('login');
  const tiles: [string, React.ReactNode, string, string, string][] = [['q', <ListChecks size={40} />, 'Needs attention', '0', 'Nothing urgent'], ['bank', <Landmark size={40} />, 'Bank lines to match', '0', '100% reconciled'], ['me', <CalendarCheck size={40} />, 'October close', '100%', 'Closed'], ['me', <CheckSquare size={40} />, 'Open tasks', '2', '0 overdue']];
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center', transform: `scale(${l >= 0 ? sp(l) : 0})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 36px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${C.line}`, fontSize: 36, fontWeight: 800 }}>
        <UserRound size={44} color={C.blue2} />accountant@firm.co.za<span style={{ padding: '6px 18px', borderRadius: 999, background: 'rgba(124,179,255,.18)', color: C.blue2, fontSize: 28 }}>Accountant</span></div></div>
    <div style={{ position: 'absolute', left: 70, right: 70, top: 420, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {tiles.map(([c, ic, label, val, foot], i) => { const k = cue(c) - (i === 3 ? 4 : 0); const p = k >= 0 ? sp(k, { damping: 11 }) : 0;
        return (<Card key={label} style={{ padding: '34px 32px', transform: `scale(${p}) rotate(${(1 - p) * (i % 2 ? 6 : -6)}deg)`, opacity: p }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28, fontWeight: 700, color: C.soft }}>{label}<span style={{ color: C.blue2 }}>{ic}</span></div>
          <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: '-.04em', marginTop: 12 }}>{val}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.green }}>{foot}</div></Card>); })}
    </div>
  </AbsoluteFill>);
};

const Checked: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const p = cue('pass');
  const rows = ['Debits equal credits', 'Receivables match invoices', 'Payables match bills', 'Every document posted', 'Locked entries protected', 'Stock matches the stock account'];
  return (<AbsoluteFill style={{ fontFamily: FONT }}>
    <Card style={{ position: 'absolute', left: 80, right: 80, top: 260, padding: '14px 40px' }}>
      {rows.map((r, i) => { const k = f - 4 - i * 4; const q = k >= 0 ? sp(k, { damping: 10, stiffness: 240 }) : 0;
        return <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '22px 0', borderTop: i ? `1px solid ${C.line}` : 0, fontSize: 36, fontWeight: 700 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', background: q ? 'rgba(52,211,153,.18)' : 'rgba(255,255,255,.06)', border: `3px solid ${q ? C.green : C.line}` }}><Check size={32} color={C.green} strokeWidth={3.2} style={{ transform: `scale(${q})` }} /></div>{r}</div>; })}
    </Card>
    {p >= 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 1110, display: 'flex', justifyContent: 'center', transform: `scale(${1.3 - 0.3 * sp(p, { damping: 10 })})`, opacity: Math.min(1, p / 3) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '24px 40px', borderRadius: 999, background: 'rgba(52,211,153,.14)', border: `3px solid ${C.green}`, fontSize: 46, fontWeight: 800 }}><ShieldCheck size={54} color={C.green} />All checks passed</div></div>}
  </AbsoluteFill>);
};

const Export: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const x = cue('xl'), t = cue('tb'), g = cue('gl'), c = cue('click');
  const btn = (k: number, label: string, top: number) => { const press = k >= 0 && k < 6 ? 0.92 : 1; const done = k >= 6;
    return <div style={{ position: 'absolute', left: 120, right: 120, top, height: 130, borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, fontSize: 42, fontWeight: 800, background: done ? 'rgba(52,211,153,.16)' : 'rgba(255,255,255,.08)', border: `3px solid ${done ? C.green : C.line}`, transform: `scale(${press * sp(f - (top > 500 ? 6 : 0))})` }}>
      {done ? <Check size={48} color={C.green} strokeWidth={3} /> : <FileSpreadsheet size={48} color="#22c55e" />}{label}</div>; };
  const file = (k: number, name: string, i: number) => { const fly = ease(k, 6, 26); return k >= 6 && <div style={{ position: 'absolute', left: 300 + i * 40 + fly * (i ? -60 : 40), top: 360 + i * 200 + fly * (720 - i * 200), display: 'flex', alignItems: 'center', gap: 12, fontSize: 32, fontWeight: 800, transform: `scale(${1 - 0.5 * fly})`, opacity: 1 - ease(k, 22, 28) }}><FileSpreadsheet size={58} color="#22c55e" />{name}</div>; };
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 240, fontSize: 92, fontWeight: 800, letterSpacing: '-.04em', transform: `scale(${x >= 0 ? 1.2 - 0.2 * sp(x) : 0.9})`, opacity: x >= 0 ? 1 : 0.3 }}>Need it in <span style={{ color: '#22c55e' }}>Excel?</span></div>
    {btn(t, 'Export trial balance', 420)}{btn(g, 'Export general ledger', 600)}
    {file(t, 'trial-balance.xlsx', 0)}{file(g, 'general-ledger.xlsx', 1)}
    <div style={{ position: 'absolute', top: 990, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `scale(${c >= 0 ? 1 + 0.12 * Math.sin(Math.min(Math.PI, c / 5)) : 1})`, opacity: ease(t, 4, 12) }}>
      <FolderOpen size={170} color={C.amber} strokeWidth={1.5} /><div style={{ fontSize: 34, fontWeight: 800, color: C.soft }}>For my accountant</div></div>
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const l = cue('love'), b = cue('brand');
  const beat = 1 + 0.08 * Math.max(0, Math.sin(f / 4)) ** 8;
  return (<AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 260, transform: `scale(${sp(l + 2) * beat})` }}><Heart size={200} color="#fb7185" fill="#fb7185" /></div>
    <div style={{ position: 'absolute', top: 520, textAlign: 'center', fontSize: 104, fontWeight: 800, letterSpacing: '-.045em', lineHeight: 1.04, transform: `scale(${1.3 - 0.3 * sp(l)})`, opacity: Math.min(1, Math.max(0, l / 4)) }}>Your accountant<br />will <span style={grad}>love you.</span></div>
    {b >= 0 && <div style={{ position: 'absolute', top: 830, transform: `scale(${sp(b, { damping: 10 })})` }}><Img src={staticFile('img/logo.png')} style={{ width: 240 }} /></div>}
    {b >= 0 && <div style={{ position: 'absolute', top: 1110, transform: `scale(${sp(b - 8) * (1 + 0.03 * Math.sin(f / 5))})` }}><Btn><ShieldCheck size={46} />Try it free · 14 days</Btn></div>}
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, clean: Clean, view: View, checked: Checked, export: Export, end: End } as const;
const ENTER = { clean: 'wipe', view: 'zoom', checked: 'slide', export: 'wipe', end: 'zoom' } as const;
export const Accountant: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).accountant; const { fps } = useVideoConfig(); const f = useCurrentFrame(); const endStart = Math.round(v.scenes[v.scenes.length - 1].start * fps);
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter={i === 0 ? 'none' : ENTER[s.id as keyof typeof ENTER]}><Comp s={s} /></SceneShell></Sequence>; })}
    <Brand hidden={f >= endStart} /><Captions video={v} /><Audio src={staticFile('audio/accountant.wav')} />
  </AbsoluteFill>);
};
