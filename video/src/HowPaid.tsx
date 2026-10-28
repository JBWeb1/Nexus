// Light explainer, 16:9: from a new invoice to being paid, clicking through real screens of the app.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertTriangle, Mail, MessageCircle, Send, Check, Bell, FileText, BellRing, BadgeCheck, ArrowRight } from 'lucide-react';
import TL from './timeline.json';
import { Captions, FONT, ease, fontFace, useSpring, type Scene, type Video } from './lib';
import { Wipes } from './mg';
import { Callout, Dot, Headline, L, LGRAD, LPhone, LightBg, LogoTile, Screen } from './explainer';

const useAt = (s: Scene) => { const { fps } = useVideoConfig(); return (n: string) => Math.round((s.cues[n] - s.start) * fps); };
const SX = 1270, SY = 530, SW = 1180; // where the app window sits in the two-column scenes
const DASH = 'img/app/dashboard.png', NEWINV = 'img/app/invoice-new.png', INVS = 'img/app/invoices.png';

const Intro: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring();
  return (<AbsoluteFill>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 90, display: 'flex', justifyContent: 'center', transform: `scale(${sp(f, { damping: 11 })})` }}><LogoTile size={120} /></div>
    <Headline k={f - 4} center x={260} y={230} width={1400} label="HOW IT WORKS" title={<>From invoice <span style={LGRAD}>to paid.</span></>} />
    <Screen srcs={[{ t: 0, src: DASH }]} aspect={0.625} w={1280} enter={10} keys={[{ t: 0, x: 960, y: 1000, rx: 28, s: 0.95 }, { t: 110, y: 930, rx: 18 }]} />
  </AbsoluteFill>);
};

const Dash: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const b = at('bank'), o = at('owe');
  return (<AbsoluteFill>
    <Headline k={f} label="DASHBOARD" title={<>See where<br />you <span style={LGRAD}>stand.</span></>} sub="Bank balance, money owed to you and what you owe, at a glance." />
    <Screen srcs={[{ t: 0, src: DASH }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -14, rx: 4 }, { t: b - 10, zoom: 1.0, ry: -6 }, { t: b + 6, zoom: 2.1, fx: 0.3, fy: 0.27, ry: 0, rx: 0 }, { t: o, fx: 0.3 }, { t: o + 14, fx: 0.49, fy: 0.27 }, { t: o + 60, zoom: 1.5, fx: 0.45, fy: 0.3 }]}
      marks={[{ t: b + 6, x: 0.205, y: 0.19, w: 0.183, h: 0.168 }, { t: o + 12, x: 0.4, y: 0.19, w: 0.183, h: 0.168, color: L.green }]}
      cursor={[{ t: b - 4, x: 0.6, y: 0.6 }, { t: b + 6, x: 0.33, y: 0.3 }, { t: o + 10, x: 0.52, y: 0.3 }]} />
    <Callout k={o + 20} x={1290} y={810} from="up"><Dot color={L.amber}><AlertTriangle size={28} /></Dot>3 invoices overdue</Callout>
  </AbsoluteFill>);
};

const New: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const c = at('click'), cu = at('cust'), ad = at('add'); const swap = c + 12;
  return (<AbsoluteFill>
    <Headline k={f} label="NEW INVOICE" title={<>Create an<br /><span style={LGRAD}>invoice.</span></>} sub="Pick the customer, add what you sold. Products fill in their price and VAT." />
    <Screen srcs={[{ t: 0, src: DASH }, { t: swap, src: NEWINV }]} aspect={0.625} w={SW}
      keys={[{ t: 0, x: SX, y: SY, zoom: 1.6, fx: 0.8, fy: 0.2 }, { t: swap, zoom: 1.6, fx: 0.8, fy: 0.2 }, { t: swap + 1, zoom: 1.2, fx: 0.55, fy: 0.3 }, { t: cu, zoom: 1.2 }, { t: cu + 12, zoom: 1.8, fx: 0.56, fy: 0.27 }, { t: ad, fx: 0.56, fy: 0.27 }, { t: ad + 14, zoom: 1.75, fx: 0.55, fy: 0.55 }]}
      cursor={[{ t: 0, x: 0.62, y: 0.4 }, { t: c + 4, x: 0.925, y: 0.064 }, { t: swap, x: 0.925, y: 0.064 }, { t: cu + 10, x: 0.42, y: 0.265 }, { t: ad + 12, x: 0.645, y: 0.555 }]}
      clicks={[c + 6, cu + 12, ad + 14]} marks={[{ t: ad + 16, x: 0.218, y: 0.522, w: 0.626, h: 0.112 }]} />
  </AbsoluteFill>);
};

const Total: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const v = at('vat'), se = at('send');
  const fly = ease(f - se, 6, 28);
  return (<AbsoluteFill>
    <Headline k={f} label="VAT AND TOTALS" title={<>The maths,<br /><span style={LGRAD}>done for you.</span></>} sub="VAT at 15% and the total, worked out as you type." />
    <Screen srcs={[{ t: 0, src: NEWINV }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, zoom: 1.75, fx: 0.55, fy: 0.55 }, { t: v + 12, zoom: 2.3, fx: 0.79, fy: 0.8 }, { t: se, zoom: 2.3 }, { t: se + 20, zoom: 1.1, fx: 0.6, fy: 0.6, ry: -10, x: SX - 60 }]}
      marks={[{ t: v + 14, x: 0.668, y: 0.755, w: 0.245, h: 0.1, color: L.green }]} />
    <Callout k={v + 22} x={830} y={720} from="left"><Dot color={L.green}><Check size={28} /></Dot>VAT 15% · R 522.00</Callout>
    {se >= 0 && <>
      <Callout k={f - se - 8} x={1400} y={180} from="right"><Dot color={L.blue}><Mail size={28} /></Dot>Email · PDF attached</Callout>
      <Callout k={f - se - 14} x={1400} y={300} from="right"><Dot color="#16a34a"><MessageCircle size={28} /></Dot>WhatsApp</Callout>
      <Send size={64} color={L.blue} style={{ position: 'absolute', left: 1100 + fly * 260, top: 520 - fly * 300, opacity: f - se < 6 ? 0 : 1 - ease(f - se, 22, 30), transform: `rotate(${fly * 20}deg)` }} /></>}
  </AbsoluteFill>);
};

const Track: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const st = at('status'), pa = at('paid'), ov = at('over');
  return (<AbsoluteFill>
    <Headline k={f} label="INVOICES" title={<>Know what's<br /><span style={LGRAD}>paid.</span></>} sub="Draft, sent, paid, overdue: every invoice shows where it stands." />
    <Screen srcs={[{ t: 0, src: INVS }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -12 }, { t: st, ry: -4 }, { t: st + 14, zoom: 1.9, fx: 0.8, fy: 0.43, ry: 0 }, { t: pa, fy: 0.43 }, { t: pa + 14, fy: 0.62 }, { t: ov, zoom: 1.9, fx: 0.8, fy: 0.62 }, { t: ov + 14, zoom: 2.1, fx: 0.5, fy: 0.16 }]}
      marks={[{ t: st + 14, x: 0.826, y: 0.395, w: 0.058, h: 0.03, until: pa + 10 }, { t: st + 18, x: 0.826, y: 0.44, w: 0.058, h: 0.03, until: pa + 10 }, { t: pa + 14, x: 0.826, y: 0.578, w: 0.05, h: 0.03, color: L.green }, { t: pa + 18, x: 0.826, y: 0.669, w: 0.05, h: 0.03, color: L.green }, { t: ov + 14, x: 0.41, y: 0.111, w: 0.195, h: 0.082, color: L.red }]} />
    <Callout k={f - ov - 22} x={1330} y={820}><Dot color={L.red}><Bell size={28} /></Dot>R 22,657.50 overdue</Callout>
  </AbsoluteFill>);
};

const Remind: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const l = at('late'), d = at('days');
  return (<AbsoluteFill>
    <Headline k={f} label="REMINDERS" title={<>Reminders,<br /><span style={LGRAD}>sent for you.</span></>} sub="A friendly note before the due date, firmer ones after. You choose the days." />
    <Screen srcs={[{ t: 0, src: 'img/app/reminders.png' }]} aspect={0.79} w={920} keys={[{ t: 0, x: SX, y: SY, ry: -14, rx: 4 }, { t: l + 4, ry: -4 }, { t: l + 18, zoom: 1.6, fx: 0.62, fy: 0.85, ry: 0, rx: 0 }, { t: d, fy: 0.85 }, { t: d + 16, zoom: 1.9, fx: 0.25, fy: 0.37 }]}
      marks={[{ t: l + 18, x: 0.77, y: 0.75, w: 0.2, h: 0.21, color: L.green, until: d + 10 }, { t: d + 16, x: 0.026, y: 0.343, w: 0.294, h: 0.067 }]}
      cursor={[{ t: d + 4, x: 0.5, y: 0.6 }, { t: d + 16, x: 0.2, y: 0.38 }]} clicks={[d + 18]} />
    <Callout k={f - d - 26} x={1330} y={830}><Dot color={L.blue}><BellRing size={28} /></Dot>−3, 0, 7, 30, 60 days</Callout>
  </AbsoluteFill>);
};

const Pay: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const p = at('pay'); const tap = p + 10; const paid = f >= tap + 6;
  return (<AbsoluteFill>
    <Headline k={f} label="CUSTOMER PORTAL" title={<>Paid <span style={LGRAD}>online.</span></>} sub="Customers open a private page, see what they owe and pay by card." />
    <LPhone src="img/app/portal-phone.png" aspect={2.167} w={370} x={1180} y={530} enter={0} cursor={[{ t: p - 10, x: 0.6, y: 0.6 }, { t: tap - 2, x: 0.82, y: 0.322 }]} clicks={[tap]}>
      {(W, H) => paid && <div style={{ position: 'absolute', left: 0.73 * W, top: 0.303 * H, width: 0.18 * W, height: 0.037 * H, borderRadius: 10, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#fff', transform: `scale(${sp(f - tap - 6)})` }}><Check size={16} strokeWidth={3} />Paid</div>}
    </LPhone>
    {paid && Array.from({ length: 14 }).map((_, i) => { const a = (i / 14) * Math.PI * 2, dd = ease(f - tap - 6, 0, 18) * 220; return <div key={i} style={{ position: 'absolute', left: 1300 + Math.cos(a) * dd, top: 350 + Math.sin(a) * dd * 0.7, width: 14, height: 14, borderRadius: 4, background: ['#2563eb', '#0ea5e9', '#059669', '#f59e0b'][i % 4], opacity: 1 - ease(f - tap - 6, 10, 22) }} />; })}
    <Callout k={f - tap - 12} x={1330} y={640} from="right" style={{ whiteSpace: 'nowrap' }}><Dot color={L.green}><BadgeCheck size={28} /></Dot>Payment received · R 3,450.00</Callout>
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring();
  const steps: [string, React.ReactNode, string][] = [['i1', <FileText size={40} />, 'Invoice.'], ['i2', <BellRing size={40} />, 'Remind.'], ['i3', <BadgeCheck size={40} />, 'Get paid.']];
  const b = f - at('brand'), fr = f - at('free');
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <div style={{ position: 'absolute', top: 170, display: 'flex', gap: 34 }}>
      {steps.map(([c, ic, t], i) => { const k = f - at(c); const q = k >= 0 ? sp(k, { damping: 11 }) : 0;
        return <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '24px 36px', borderRadius: 28, background: '#fff', boxShadow: '0 30px 60px -20px rgba(15,23,42,.25)', fontFamily: FONT, fontSize: 52, fontWeight: 800, color: i === 2 ? L.green : L.ink, transform: `translateY(${(1 - q) * 60}px) scale(${0.8 + 0.2 * q})`, opacity: q }}>
          <span style={{ color: i === 2 ? L.green : L.blue, display: 'flex' }}>{ic}</span>{t}</div>; })}</div>
    <div style={{ position: 'absolute', top: 400, transform: `scale(${b >= 0 ? sp(b, { damping: 11 }) : 0})` }}><LogoTile size={180} /></div>
    {b >= 0 && <div style={{ position: 'absolute', top: 610, fontFamily: FONT, fontSize: 64, fontWeight: 800, letterSpacing: '-.03em', color: L.ink, opacity: ease(b, 4, 14) }}>Nexus Ledger</div>}
    {fr >= 0 && <div style={{ position: 'absolute', top: 730, transform: `scale(${sp(fr) * (1 + 0.025 * Math.sin(f / 5))})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '26px 52px', borderRadius: 999, background: 'linear-gradient(90deg,#2563eb,#0ea5e9)', fontFamily: FONT, fontSize: 40, fontWeight: 800, color: '#fff', boxShadow: '0 24px 60px -14px rgba(37,99,235,.7)' }}>Try it free for 14 days<ArrowRight size={42} /></div></div>}
  </AbsoluteFill>);
};

const SCENES = { intro: Intro, dash: Dash, new: New, total: Total, track: Track, remind: Remind, pay: Pay, end: End } as const;
export const HowPaid: React.FC = () => {
  const v = (TL as unknown as Record<string, Video>).howpaid; const { fps } = useVideoConfig();
  const cuts = v.scenes.slice(1).map((s) => Math.round(s.start * fps));
  return (<AbsoluteFill style={{ background: L.bg }}><style>{fontFace}</style>
    {v.scenes.map((s) => { const Comp = SCENES[s.id as keyof typeof SCENES];
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={Math.round(s.dur * fps) + 14}><LightBg /><Comp s={s} /></Sequence>; })}
    <Wipes cuts={cuts} colors={['#2563eb', '#93c5fd', '#ffffff']} />
    <Captions video={v} top={975} size={34} side={300} light /><Audio src={staticFile('audio/howpaid.wav')} />
  </AbsoluteFill>);
};
