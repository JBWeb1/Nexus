// Lead generation, 9:16: three questions, the three answers, the price, the free trial.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Percent, Clock, TrendingUp, Check, MessageCircle, Mail, CreditCard, ArrowRight, FileText, Package, FolderKanban, Camera, ShieldCheck } from 'lucide-react';
import TL from './timeline.json';
import { Brand, C, Captions, Card, FONT, SceneShell, ease, fontFace, shake, useSpring, type Scene, type Video } from './lib';
import { Draw, Floaters, GRAD, Pill, Ring, Wipes, Words, count } from './mg';

const useCue = (s: Scene) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (name: string, extra = 0) => f - Math.round((s.cues[name] - s.start + extra) * fps); };

const Hook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const t = cue('three');
  const qs: [string, React.ReactNode, string][] = [['q1', <Percent size={46} color={C.cyan} />, 'Do you dread VAT time?'], ['q2', <Clock size={46} color={C.amber} />, 'Do clients pay you late?'], ['q3', <TrendingUp size={46} color={C.red} />, 'Does your software cost more every year?']];
  const lastQ = cue('q1'); const shrink = lastQ >= 0 ? sp(lastQ, { damping: 16 }) : 0;
  return (<AbsoluteFill>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 230 - shrink * 30, textAlign: 'center', fontFamily: FONT, fontWeight: 800, letterSpacing: '-.06em', lineHeight: 1, fontSize: 420 - shrink * 250, transform: `${shake(t, 18, 12)} scale(${2 - sp(t + 1, { damping: 10 })})` }}><span style={GRAD}>3</span></div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 640 - shrink * 300, opacity: 1 - shrink }}><Words text="quick questions." k={t + 4} size={90} /></div>
    {qs.map(([c, ic, q], i) => { const k = cue(c); const p = k >= 0 ? sp(k, { damping: 13 }) : 0;
      return (<div key={c} style={{ position: 'absolute', left: 70, right: 70, top: 440 + i * 270, transform: `translateX(${(1 - p) * (i % 2 ? 1100 : -1100)}px)` }}>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 30, padding: '36px 40px' }}>
          <div style={{ fontFamily: FONT, fontSize: 70, fontWeight: 800, letterSpacing: '-.04em', color: 'rgba(255,255,255,.25)' }}>0{i + 1}</div>
          <div style={{ flex: 'none' }}>{ic}</div><div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.15 }}>{q}</div></Card></div>); })}
  </AbsoluteFill>);
};

const Yes: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const y = cue('yes'), u = cue('you');
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <Draw k={y + 4} dur={18} size={[760, 420]} len={2200} stroke={C.green} width={10} style={{ left: 160, top: 360 }} d="M380 20 C 620 10 740 120 740 210 C 740 330 560 410 370 405 C 170 400 20 330 22 210 C 25 100 160 25 400 30" />
    <div style={{ position: 'absolute', top: 430, fontFamily: FONT, fontSize: 250, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 1, transform: `scale(${y >= 0 ? 1.5 - 0.5 * sp(y, { damping: 9 }) : 0})` }}>YES?</div>
    {u >= 0 && <div style={{ position: 'absolute', top: 900, left: 60, right: 60 }}><Words text="This is for you." k={u - 4} size={110} accent={{ 3: GRAD }} /></div>}
  </AbsoluteFill>);
};

const Vat: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const v = cue('vat');
  const rows: [string, number][] = [['Output tax', 41820.0], ['Input tax', 18436.52], ['VAT payable', 23383.48]];
  return (<AbsoluteFill>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 250 }}><Words text="VAT201," k={f} size={140} accent={{ 0: GRAD }} /></div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 430 }}><Words text="worked out for you." k={v} size={84} /></div>
    <Card style={{ position: 'absolute', left: 90, right: 90, top: 640, padding: '20px 44px', transform: `translateY(${(1 - sp(f - 4)) * 500}px)` }}>
      {rows.map(([t, n], i) => { const k = v - i * 6; return (<div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 0', borderTop: i ? `1px solid ${C.line}` : 0, fontSize: i === 2 ? 46 : 40, fontWeight: 800, color: i === 2 ? C.green : '#fff' }}>
        <span style={{ color: i === 2 ? C.green : C.soft }}>{t}</span><span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>R {count(k, n, 0, 20, 2)}{k >= 20 && <Check size={40} color={C.green} strokeWidth={3} style={{ transform: `scale(${sp(k - 20)})` }} />}</span></div>); })}
    </Card>
  </AbsoluteFill>);
};

const Paid: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const w = cue('wa'), e = cue('em');
  const note = (k: number, ic: React.ReactNode, app: string, text: string, top: number) => { const p = k >= 0 ? sp(k, { damping: 13 }) : 0;
    return <div style={{ position: 'absolute', left: 80, right: 80, top, transform: `translateY(${(1 - p) * -300}px) scale(${0.9 + 0.1 * p})`, opacity: p }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', padding: '30px 34px', borderRadius: 40, background: 'rgba(255,255,255,.1)', border: `1px solid ${C.line}`, boxShadow: '0 30px 80px rgba(0,0,0,.45)', fontFamily: FONT }}>
        <div style={{ width: 84, height: 84, borderRadius: 22, display: 'grid', placeItems: 'center', background: app === 'WhatsApp' ? '#25d366' : '#2563eb', flex: 'none' }}>{ic}</div>
        <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 700, color: C.soft }}><span>{app}</span><span style={{ marginLeft: 30 }}>now</span></div><div style={{ fontSize: 34, fontWeight: 700, color: '#fff', marginTop: 6, lineHeight: 1.3 }}>{text}</div></div></div></div>; };
  return (<AbsoluteFill>
    <div style={{ position: 'absolute', left: 60, right: 60, top: 240 }}><Words text="Late payers? Chased for you." k={f} size={96} accent={{ 3: GRAD, 4: GRAD }} /></div>
    {note(w, <MessageCircle size={48} color="#fff" />, 'WhatsApp', 'Invoice INV-0042 for R 4,830.00 is now overdue. Tap to pay.', 560)}
    {note(e, <Mail size={48} color="#fff" />, 'Email', 'Reminder: INV-0042 · R 4,830.00 · PDF attached', 830)}
    {e >= 12 && <div style={{ position: 'absolute', left: 0, right: 0, top: 1130, display: 'flex', justifyContent: 'center' }}><Pill p={sp(e - 12)} color="rgba(52,211,153,.6)"><Check size={38} color={C.green} />Sent automatically</Pill></div>}
  </AbsoluteFill>);
};

const Price: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const fl = cue('flat'), r = cue('r250'), a = cue('all');
  const chips: [React.ReactNode, string][] = [[<FileText size={34} />, 'Invoices'], [<Percent size={34} />, 'VAT201'], [<Package size={34} />, 'Stock'], [<FolderKanban size={34} />, 'Projects'], [<Camera size={34} />, 'Receipts'], [<ShieldCheck size={34} />, 'Books health']];
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 260 }}><Words text="One flat price." k={fl} size={92} /></div>
    <div style={{ position: 'absolute', top: 400, fontFamily: FONT, fontSize: 330, fontWeight: 800, letterSpacing: '-.06em', lineHeight: 1, transform: `${shake(r - 3, 26, 14)} scale(${r >= 0 ? 2.6 - 1.6 * sp(r, { damping: 9, stiffness: 200 }) : 0})` }}><span style={GRAD}>R250</span></div>
    <div style={{ position: 'absolute', top: 760, fontFamily: FONT, fontSize: 44, fontWeight: 700, color: C.soft, opacity: ease(r, 8, 16) }}>a month · per company</div>
    <div style={{ position: 'absolute', left: 70, right: 70, top: 870, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
      {chips.map(([ic, t], i) => <Pill key={t} p={a >= 0 ? sp(a - i * 2, { damping: 11 }) : 0}><span style={{ color: C.cyan, display: 'flex' }}>{ic}</span>{t}</Pill>)}</div>
  </AbsoluteFill>);
};

const Offer: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const d = cue('days'), c = cue('card');
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <Ring k={d} r={260} x={540} y={640} stroke={C.green} width={16} dur={26} />
    <Ring k={f} r={300} x={540} y={640} stroke="rgba(124,179,255,.25)" width={3} dur={20} rotate={f} />
    <div style={{ position: 'absolute', top: 470, fontFamily: FONT, fontSize: 250, fontWeight: 800, letterSpacing: '-.06em', lineHeight: 1 }}><span style={GRAD}>{Math.round(14 * ease(d, 0, 26))}</span></div>
    <div style={{ position: 'absolute', top: 730, fontFamily: FONT, fontSize: 56, fontWeight: 800, opacity: ease(d, 6, 14) }}>days free</div>
    {c >= 0 && <div style={{ position: 'absolute', top: 1020 }}><Pill p={sp(c)} style={{ fontSize: 46, padding: '22px 40px' }}><span style={{ position: 'relative', display: 'inline-flex' }}><CreditCard size={50} color={C.blue2} /><span style={{ position: 'absolute', left: -6, top: 22, height: 6, borderRadius: 3, width: 62 * ease(c, 4, 10), background: C.red, transform: 'rotate(-30deg)' }} /></span>No card needed</Pill></div>}
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const cue = useCue(s); const sp = useSpring(); const b = cue('brand'), c = cue('cta');
  const pulse = 1 + 0.035 * Math.sin(f / 5);
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <Ring k={b} r={220} x={540} y={480} stroke={C.cyan} width={5} dur={22} rotate={f * 0.6} />
    <div style={{ position: 'absolute', top: 330, transform: `scale(${sp(b, { damping: 11 })})` }}><Img src={staticFile('img/logo.png')} style={{ width: 300 }} /></div>
    {c >= 0 && <div style={{ position: 'absolute', top: 780, left: 60, right: 60 }}><Words text="Start your free trial today." k={c} size={92} accent={{ 2: GRAD, 3: GRAD }} /></div>}
    {c >= 0 && <div style={{ position: 'absolute', top: 1080, transform: `scale(${sp(c - 10) * pulse})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '32px 60px', borderRadius: 999, background: 'linear-gradient(90deg,#2563eb,#0ea5e9)', fontFamily: FONT, fontSize: 50, fontWeight: 800, color: '#fff', boxShadow: '0 24px 70px -12px rgba(37,99,235,.8)' }}>Start free<ArrowRight size={52} /></div></div>}
  </AbsoluteFill>);
};

const SCENES = { hook: Hook, yes: Yes, vat: Vat, paid: Paid, price: Price, offer: Offer, end: End } as const;
export const Leads: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).leads; const { fps } = useVideoConfig(); const f = useCurrentFrame();
  const cuts = v.scenes.slice(1).map((s) => Math.round(s.start * fps)); const endStart = cuts[cuts.length - 1];
  return (<AbsoluteFill style={{ background: C.bg }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => { const Comp = SCENES[s.id as keyof typeof SCENES]; const dur = Math.round(s.dur * fps);
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={dur + 14}><SceneShell durFrames={dur} enter="none"><Floaters seed={i + 3} /><Comp s={s} /></SceneShell></Sequence>; })}
    <Wipes cuts={cuts} />
    <Brand hidden={f >= endStart} /><Captions video={v} /><Audio src={staticFile('audio/leads.wav')} />
  </AbsoluteFill>);
};
