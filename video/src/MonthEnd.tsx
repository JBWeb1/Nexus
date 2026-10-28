// Light explainer, 16:9: month end in Nexus, from slips to reports, clicking through real screens of the app.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CalendarCheck, Check, Camera, Landmark, ListChecks, Info, FileSpreadsheet, TrendingUp, ArrowRight, ShieldCheck } from 'lucide-react';
import TL from './timeline.json';
import { Captions, FONT, ease, fontFace, useSpring, type Scene, type Video } from './lib';
import { Wipes } from './mg';
import { Callout, Dot, Headline, L, LGRAD, Vertical, useLay, LightBg, LogoTile, Screen } from './explainer';

const useAt = (s: Scene) => { const { fps } = useVideoConfig(); return (n: string) => Math.round((s.cues[n] - s.start) * fps); };


const Intro: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { V, SX, SY, SW } = useLay(); const sp = useSpring();
  return (<AbsoluteFill>
    <div style={{ position: 'absolute', left: 0, right: 0, top: V ? 150 : 90, display: 'flex', justifyContent: 'center', gap: 24 }}>
      <div style={{ transform: `scale(${sp(f, { damping: 11 })})` }}><LogoTile size={120} /></div>
      <div style={{ width: 120, height: 120, borderRadius: 30, background: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 20px 40px -14px rgba(15,23,42,.3)', transform: `scale(${sp(f - 6, { damping: 11 })}) rotate(${(1 - sp(f - 6)) * 30}deg)` }}><CalendarCheck size={64} color={L.blue} /></div></div>
    <Headline k={f - 4} center x={260} y={230} width={1400} label="MONTH END" title={<>Your books, <span style={LGRAD}>done.</span></>} />
    <Screen srcs={[{ t: 0, src: 'img/app/workqueue.png' }]} aspect={0.625} w={V ? 1000 : 1280} enter={10} keys={[{ t: 0, x: V ? 540 : 960, y: V ? 1260 : 1000, rx: 28, s: 0.95 }, { t: 140, y: V ? 1170 : 930, rx: 18 }]} />
  </AbsoluteFill>);
};

const Receipts: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { V, SX, SY, SW } = useLay(); const at = useAt(s); const sn = at('snap'), r = at('read'), sv = at('save');
  return (<AbsoluteFill>
    <Headline k={f} label="RECEIPTS" title={<>Snap a <span style={LGRAD}>slip.</span></>} sub="Nexus reads the supplier, date, total and VAT. You check it and save the bill." />
    <Screen srcs={[{ t: 0, src: 'img/app/receipt-read.png' }]} aspect={0.745} w={1040} keys={[{ t: 0, x: SX, y: SY, zoom: 1.7, fx: 0.36, fy: 0.66 }, { t: r, zoom: 1.7, fx: 0.36, fy: 0.66 }, { t: r + 16, zoom: 1.55, fx: 0.72, fy: 0.58 }, { t: sv - 4, fy: 0.62 }, { t: sv + 10, zoom: 1.6, fx: 0.66, fy: 0.84 }]}
      marks={[{ t: r + 16, x: 0.524, y: 0.478, w: 0.265, h: 0.043 }, { t: r + 26, x: 0.524, y: 0.553, w: 0.198, h: 0.043 }, { t: r + 36, x: 0.524, y: 0.703, w: 0.198, h: 0.043 }]}
      cursor={[{ t: sv - 12, x: 0.8, y: 0.75 }, { t: sv + 8, x: 0.565, y: 0.925 }]} clicks={[sv + 10]} />
    {/* camera flash on the snap */}
    <AbsoluteFill style={{ background: '#fff', opacity: f >= sn ? ease(f - sn, 0, 10, 0.85, 0) : 0 }} />
    <Callout k={f - sn - 8} x={760} y={200} vy={1560} from="left"><Dot color={L.blue}><Camera size={28} /></Dot>Photo of a till slip</Callout>
    <Callout k={f - sv - 18} x={1360} y={820} vy={1650}><Dot color={L.green}><Check size={28} /></Dot>Saved as a bill</Callout>
  </AbsoluteFill>);
};

const Bank: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { V, SX, SY, SW } = useLay(); const at = useAt(s); const m = at('match'), a = at('all');
  return (<AbsoluteFill>
    <Headline k={f} label="BANKING" title={<>Every line <span style={LGRAD}>matched.</span></>} sub="Statement lines are matched to invoices and bills. Rules sort the regulars." />
    <Screen srcs={[{ t: 0, src: 'img/app/banking.png' }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -14, rx: 4 }, { t: m, ry: -4 }, { t: m + 14, zoom: 1.8, fx: 0.75, fy: 0.36, ry: 0, rx: 0 }, { t: a + 6, zoom: 1.8, fy: 0.78 }, { t: a + 40, zoom: 1.3, fx: 0.6, fy: 0.6 }]}
      marks={[{ t: m + 14, x: 0.862, y: 0.305, w: 0.058, h: 0.67, color: L.green }]} />
    <Callout k={f - a - 10} x={1310} y={820}><Dot color={L.green}><Landmark size={28} /></Dot>Every rand accounted for</Callout>
  </AbsoluteFill>);
};

const Queue: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { V, SX, SY, SW } = useLay(); const at = useAt(s); const n = at('need'), w = at('why');
  return (<AbsoluteFill>
    <Headline k={f} label="WORK QUEUE" title={<>Only what<br /><span style={LGRAD}>needs you.</span></>} sub="Rule-based checks flag what needs a human, and show the evidence." />
    <Screen srcs={[{ t: 0, src: 'img/app/workqueue.png' }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -12 }, { t: n, ry: -4 }, { t: n + 14, zoom: 1.8, fx: 0.5, fy: 0.32, ry: 0 }]}
      marks={[{ t: n + 14, x: 0.205, y: 0.262, w: 0.623, h: 0.11, color: L.red }]}
      cursor={[{ t: w - 6, x: 0.6, y: 0.5 }, { t: w + 8, x: 0.31, y: 0.345 }]} clicks={[w + 10]} />
    <Callout k={f - w - 16} x={1240} y={820}><Dot color={L.amber}><Info size={28} /></Dot>2 are more than 30 days overdue</Callout>
  </AbsoluteFill>);
};

const Vat: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { V, SX, SY, SW } = useLay(); const at = useAt(s); const v = at('vat'), c = at('check');
  return (<AbsoluteFill>
    <Headline k={f} label="VAT201" title={<>VAT, <span style={LGRAD}>worked out.</span></>} sub="Straight from the ledger. Review it, then finalise the period." />
    <Screen srcs={[{ t: 0, src: 'img/app/vat201.png' }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -12 }, { t: v + 4, ry: -2 }, { t: v + 18, zoom: 1.8, fx: 0.48, fy: 0.55, ry: 0 }, { t: c, fy: 0.55 }, { t: c + 14, zoom: 1.6, fx: 0.5, fy: 0.45 }]}
      marks={[{ t: v + 20, x: 0.205, y: 0.538, w: 0.535, h: 0.034 }, { t: v + 28, x: 0.205, y: 0.578, w: 0.535, h: 0.034 }, { t: c + 10, x: 0.205, y: 0.62, w: 0.535, h: 0.04, color: L.green }]}
      cursor={[{ t: c + 4, x: 0.5, y: 0.75 }, { t: c + 22, x: 0.68, y: 0.35 }]} />
    <Callout k={f - c - 26} x={1180} y={820}><Dot color={L.blue}><ShieldCheck size={28} /></Dot>Review before filing on SARS eFiling</Callout>
  </AbsoluteFill>);
};

const Reports: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { V, SX, SY, SW } = useLay(); const at = useAt(s); const sp = useSpring(); const p = at('pl'), e = at('export'); const ck = e + 12; const fly = ease(f - ck, 4, 26);
  return (<AbsoluteFill>
    <Headline k={f} label="REPORTS" title={<>Reports,<br /><span style={LGRAD}>always current.</span></>} sub="Profit and loss, balance sheet, trial balance and ageing, one click to Excel." />
    <Screen srcs={[{ t: 0, src: 'img/app/reports.png' }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -12 }, { t: p + 4, ry: -3 }, { t: p + 20, zoom: 1.5, fx: 0.6, fy: 0.4, ry: 0 }, { t: p + 80, fy: 0.85 }, { t: e, fy: 0.85 }, { t: e + 12, zoom: 2.0, fx: 0.86, fy: 0.08 }]}
      marks={[{ t: p + 84, x: 0.21, y: 0.88, w: 0.765, h: 0.05, until: e }, { t: e + 12, x: 0.857, y: 0.04, w: 0.116, h: 0.045 }]}
      cursor={[{ t: e - 4, x: 0.7, y: 0.25 }, { t: e + 10, x: 0.915, y: 0.063 }]} clicks={[ck]} />
    {f >= ck + 4 && <div style={{ position: 'absolute', left: (V ? 700 : 1650) - fly * (V ? 450 : 900), top: (V ? 760 : 220) + fly * (V ? 640 : 520), display: 'flex', alignItems: 'center', gap: 14, padding: '18px 26px', borderRadius: 20, background: '#fff', boxShadow: '0 30px 60px -18px rgba(15,23,42,.3)', fontFamily: FONT, fontSize: 28, fontWeight: 800, color: L.ink, transform: `scale(${sp(f - ck - 4) * (1 - 0.2 * fly)}) rotate(${-fly * 8}deg)`, zIndex: 40 }}><FileSpreadsheet size={40} color="#16a34a" />trial-balance.xlsx</div>}
  </AbsoluteFill>);
};

const Insights: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { V, SX, SY, SW } = useLay(); const at = useAt(s); const w = at('why'), c = at('cust');
  return (<AbsoluteFill>
    <Headline k={f} label="INSIGHTS" title={<>Know why<br />it <span style={LGRAD}>moved.</span></>} sub="Click any month to see what changed, down to the customers behind it." />
    <Screen srcs={[{ t: 0, src: 'img/app/insights.png' }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -12 }, { t: w, ry: -3 }, { t: w + 14, zoom: 1.8, fx: 0.85, fy: 0.4, ry: 0 }, { t: c, fx: 0.85, fy: 0.4 }, { t: c + 14, zoom: 1.75, fx: 0.75, fy: 0.82 }]}
      marks={[{ t: w + 14, x: 0.902, y: 0.33, w: 0.042, h: 0.2, until: c + 6 }, { t: c + 14, x: 0.525, y: 0.84, w: 0.44, h: 0.06, color: L.green }]}
      cursor={[{ t: w + 4, x: 0.7, y: 0.6 }, { t: w + 16, x: 0.923, y: 0.53 }]} clicks={[w + 18]} />
    <Callout k={f - c - 22} x={1290} y={830}><Dot color={L.green}><TrendingUp size={28} /></Dot>Revenue up R22 040 this month</Callout>
  </AbsoluteFill>);
};

const End: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { V, SX, SY, SW } = useLay(); const at = useAt(s); const sp = useSpring(); const t = f - at('title'), b = f - at('brand'), fr = f - at('free');
  const ticks = ['Receipts', 'Banking', 'Work queue', 'VAT201', 'Reports'];
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <Headline k={t} center x={260} y={110} width={1400} label="MONTH END" title={<>Month end, <span style={LGRAD}>sorted.</span></>} />
    <div style={{ position: 'absolute', top: V ? 560 : 340, left: V ? 60 : undefined, right: V ? 60 : undefined, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18 }}>
      {ticks.map((n, i) => { const q = sp(t - 6 - i * 3, { damping: 12 }); return <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderRadius: 999, background: '#fff', boxShadow: '0 16px 34px -14px rgba(15,23,42,.3)', fontFamily: FONT, fontSize: 28, fontWeight: 800, color: L.ink, transform: `scale(${q})`, opacity: q }}><Check size={28} color={L.green} strokeWidth={3} />{n}</div>; })}</div>
    <div style={{ position: 'absolute', top: V ? 860 : 470, transform: `scale(${b >= 0 ? sp(b, { damping: 11 }) : 0})` }}><LogoTile size={V ? 220 : 170} /></div>
    {b >= 0 && <div style={{ position: 'absolute', top: V ? 1120 : 670, fontFamily: FONT, fontSize: V ? 76 : 60, fontWeight: 800, letterSpacing: '-.03em', color: L.ink, opacity: ease(b, 4, 14) }}>Nexus Ledger</div>}
    {fr >= 0 && <div style={{ position: 'absolute', top: V ? 1270 : 780, transform: `scale(${sp(fr) * (1 + 0.025 * Math.sin(f / 5))})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '26px 52px', borderRadius: 999, background: 'linear-gradient(90deg,#2563eb,#0ea5e9)', fontFamily: FONT, fontSize: 40, fontWeight: 800, color: '#fff', boxShadow: '0 24px 60px -14px rgba(37,99,235,.7)' }}>Try it free for 14 days<ArrowRight size={42} /></div></div>}
  </AbsoluteFill>);
};

const SCENES = { intro: Intro, receipts: Receipts, bank: Bank, queue: Queue, vat: Vat, reports: Reports, insights: Insights, end: End } as const;
export const MonthEnd: React.FC<{ vertical?: boolean }> = ({ vertical = false }) => {
  const v = (TL as unknown as Record<string, Video>).monthend; const { fps } = useVideoConfig();
  const cuts = v.scenes.slice(1).map((s) => Math.round(s.start * fps));
  return (<Vertical.Provider value={vertical}><AbsoluteFill style={{ background: L.bg }}><style>{fontFace}</style>
    {v.scenes.map((s) => { const Comp = SCENES[s.id as keyof typeof SCENES];
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={Math.round(s.dur * fps) + 14}><LightBg /><Comp s={s} /></Sequence>; })}
    <Wipes cuts={cuts} colors={['#2563eb', '#93c5fd', '#ffffff']} />
    {vertical ? <Captions video={v} top={1765} size={46} side={60} light /> : <Captions video={v} top={975} size={34} side={300} light />}<Audio src={staticFile('audio/monthend.wav')} />
  </AbsoluteFill></Vertical.Provider>);
};
