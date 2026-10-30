// Two light-explainer TikToks on real app screens, each opening on a question a business owner asks themselves.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { TrendingUp, AlertTriangle, FileSpreadsheet, Check, ArrowRight, Package, Clock, Receipt, Scale } from 'lucide-react';
import TL from './timeline.json';
import { Captions, FONT, ease, fontFace, useSpring, type Scene, type Video } from './lib';
import { Wipes } from './mg';
import { Callout, Dot, Headline, L, LGRAD, LightBg, LogoTile, Screen, Vertical, useLay } from './explainer';

const useAt = (s: Scene) => { const { fps } = useVideoConfig(); return (n: string) => Math.round((s.cues[n] - s.start) * fps); };
const img = (n: string) => `img/app/${n}.png`;

/** The opening question: huge dark words rising line by line, the key words in blue. */
const HookTitle: React.FC<{ k: number; lines: React.ReactNode[] }> = ({ k, lines }) => (
  <div style={{ position: 'absolute', left: 50, right: 50, top: 250, fontFamily: FONT, fontWeight: 800, fontSize: 108, letterSpacing: '-.045em', lineHeight: 1.02, color: L.ink, textAlign: 'center' }}>
    {lines.map((l, i) => <div key={i} style={{ overflow: 'hidden', paddingBottom: 10 }}><div style={{ transform: `translateY(${(1 - ease(k - i * 5, 0, 12)) * 110}%)` }}>{l}</div></div>)}
  </div>);

/** Ending: title, ticked chips, logo, free-trial button. */
const End: React.FC<{ s: Scene; title: React.ReactNode; ticks: string[] }> = ({ s, title, ticks }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const t = f - at('title'), b = f - at('brand'), fr = f - at('free');
  return (<AbsoluteFill style={{ alignItems: 'center' }}>
    <Headline k={t} center x={260} y={110} width={1400} label="NEXUS LEDGER" title={title} />
    <div style={{ position: 'absolute', top: 560, left: 60, right: 60, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18 }}>
      {ticks.map((n, i) => { const q = sp(t - 6 - i * 3, { damping: 12 }); return <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 28px', borderRadius: 999, background: '#fff', boxShadow: '0 16px 34px -14px rgba(15,23,42,.3)', fontFamily: FONT, fontSize: 34, fontWeight: 800, color: L.ink, transform: `scale(${q})`, opacity: q }}><Check size={32} color={L.green} strokeWidth={3} />{n}</div>; })}</div>
    <div style={{ position: 'absolute', top: 820, transform: `scale(${b >= 0 ? sp(b, { damping: 11 }) : 0})` }}><LogoTile size={230} /></div>
    {b >= 0 && <div style={{ position: 'absolute', top: 1090, fontFamily: FONT, fontSize: 76, fontWeight: 800, letterSpacing: '-.03em', color: L.ink, opacity: ease(b, 4, 14) }}>Nexus Ledger</div>}
    {fr >= 0 && <div style={{ position: 'absolute', top: 1250, transform: `scale(${sp(fr) * (1 + 0.025 * Math.sin(f / 5))})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '30px 60px', borderRadius: 999, background: 'linear-gradient(90deg,#2563eb,#0ea5e9)', fontFamily: FONT, fontSize: 46, fontWeight: 800, color: '#fff', boxShadow: '0 24px 60px -14px rgba(37,99,235,.7)' }}>Try it free for 14 days<ArrowRight size={48} /></div></div>}
  </AbsoluteFill>);
};

// ---------------------------------------------------------------- "Did you make money last month?"
const NHook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const sp = useSpring(); const m = f - at('money');
  return (<AbsoluteFill>
    <HookTitle k={f} lines={['Did your', 'business', <>actually <span style={{ ...LGRAD, display: 'inline-block', transform: `scale(${m >= 0 ? 1 + 0.12 * Math.sin(Math.min(Math.PI, m / 5)) : 1})` }}>make money</span></>, 'last month?']} />
    <Screen srcs={[{ t: 0, src: img('dashboard') }]} aspect={0.625} w={1000} enter={12} keys={[{ t: 0, x: 540, y: 1360, rx: 30, s: 0.95 }, { t: 140, y: 1265, rx: 16 }]} />
  </AbsoluteFill>);
};
const NDash: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { SX, SY, SW } = useLay(); const at = useAt(s); const p = at('profit');
  return (<AbsoluteFill>
    <Headline k={f} label="DASHBOARD" title={<>Profit, <span style={LGRAD}>at a glance.</span></>} sub="The moment you sign in." />
    <Screen srcs={[{ t: 0, src: img('dashboard') }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -10, rx: 4 }, { t: p - 10, ry: 0, rx: 0, zoom: 1.1 }, { t: p + 8, zoom: 2.1, fx: 0.88, fy: 0.27 }]}
      marks={[{ t: p + 8, x: 0.79, y: 0.19, w: 0.183, h: 0.168, color: L.green }]} cursor={[{ t: p - 12, x: 0.6, y: 0.6 }, { t: p + 6, x: 0.9, y: 0.32 }]} />
    <Callout k={f - p - 16} x={0} y={0}><Dot color={L.green}><TrendingUp size={30} /></Dot>R 23,690.00 profit this month</Callout>
  </AbsoluteFill>);
};
const NWhy: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { SX, SY, SW } = useLay(); const at = useAt(s); const w = at('click'), c = at('cust');
  return (<AbsoluteFill>
    <Headline k={f} label="INSIGHTS" title={<>Know <span style={LGRAD}>why it moved.</span></>} sub="Click any month, see what changed." />
    <Screen srcs={[{ t: 0, src: img('insights') }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -10 }, { t: w + 6, ry: 0 }, { t: w + 20, zoom: 1.8, fx: 0.85, fy: 0.4 }, { t: c, fx: 0.85, fy: 0.4 }, { t: c + 14, zoom: 1.75, fx: 0.75, fy: 0.82 }]}
      marks={[{ t: w + 22, x: 0.902, y: 0.33, w: 0.042, h: 0.2, until: c + 6 }, { t: c + 14, x: 0.525, y: 0.84, w: 0.44, h: 0.06, color: L.green }]}
      cursor={[{ t: w + 6, x: 0.7, y: 0.6 }, { t: w + 22, x: 0.923, y: 0.53 }]} clicks={[w + 24]} />
    <Callout k={f - c - 22} x={0} y={0}><Dot color={L.green}><TrendingUp size={30} /></Dot>Revenue up R22 040 this month</Callout>
  </AbsoluteFill>);
};
const NJobs: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { SX, SY, SW } = useLay(); const at = useAt(s); const j = at('jobs'), lo = at('lose');
  return (<AbsoluteFill>
    <Headline k={f} label="PROJECTS" title={<>Which jobs <span style={LGRAD}>pay?</span></>} sub="Income, costs and hours per job." />
    <Screen srcs={[{ t: 0, src: img('projects') }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -10 }, { t: j, ry: 0, zoom: 1.1 }, { t: j + 14, zoom: 1.9, fx: 0.58, fy: 0.3 }, { t: lo, fx: 0.58, fy: 0.3 }, { t: lo + 12, zoom: 1.7, fx: 0.62, fy: 0.45 }]}
      marks={[{ t: j + 14, x: 0.465, y: 0.243, w: 0.247, h: 0.107, color: L.red, until: lo + 4 }, { t: lo + 12, x: 0.206, y: 0.43, w: 0.765, h: 0.047, color: L.red }]} />
    <Callout k={f - lo - 18} x={0} y={0}><Dot color={L.red}><AlertTriangle size={30} /></Dot>Grand Hotel job: −R 1,320.00</Callout>
  </AbsoluteFill>);
};
const NHours: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { SX, SY, SW } = useLay(); const at = useAt(s); const l = at('log'), b = at('bill');
  return (<AbsoluteFill>
    <Headline k={f} label="TIME" title={<>Hours in, <span style={LGRAD}>invoice out.</span></>} sub="Log time, then bill it in one click." />
    <Screen srcs={[{ t: 0, src: img('project') }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, zoom: 1.6, fx: 0.55, fy: 0.5 }, { t: b, zoom: 1.6, fx: 0.55, fy: 0.5 }, { t: b + 14, zoom: 2.1, fx: 0.78, fy: 0.16 }]}
      marks={[{ t: l + 10, x: 0.205, y: 0.415, w: 0.71, h: 0.15, until: b + 6 }, { t: b + 14, x: 0.726, y: 0.122, w: 0.075, h: 0.042, color: L.green }]}
      cursor={[{ t: l + 4, x: 0.6, y: 0.62 }, { t: l + 22, x: 0.873, y: 0.537 }, { t: b + 14, x: 0.765, y: 0.145 }]} clicks={[l + 24, b + 16]} />
    <Callout k={f - b - 22} x={0} y={0}><Dot color={L.blue}><Clock size={30} /></Dot>Billable hours → invoice</Callout>
  </AbsoluteFill>);
};
const NExcel: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { SX, SY, SW } = useLay(); const at = useAt(s); const sp = useSpring(); const e = at('export'); const ck = e + 10; const fly = ease(f - ck, 4, 26);
  return (<AbsoluteFill>
    <Headline k={f} label="REPORTS" title={<>Your accountant? <span style={LGRAD}>Sorted.</span></>} sub="Trial balance and ledger, straight to Excel." />
    <Screen srcs={[{ t: 0, src: img('reports') }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -10, zoom: 1.2, fx: 0.6, fy: 0.4 }, { t: e - 4, ry: 0 }, { t: e + 8, zoom: 2.1, fx: 0.86, fy: 0.08 }]}
      marks={[{ t: e + 10, x: 0.857, y: 0.04, w: 0.116, h: 0.045 }]} cursor={[{ t: e - 6, x: 0.7, y: 0.3 }, { t: e + 8, x: 0.915, y: 0.063 }]} clicks={[ck]} />
    {f >= ck + 4 && <div style={{ position: 'absolute', left: 640 - fly * 380, top: 760 + fly * 700, display: 'flex', alignItems: 'center', gap: 14, padding: '20px 30px', borderRadius: 22, background: '#fff', boxShadow: '0 30px 60px -18px rgba(15,23,42,.3)', fontFamily: FONT, fontSize: 34, fontWeight: 800, color: L.ink, transform: `scale(${sp(f - ck - 4) * (1 - 0.15 * fly)}) rotate(${-fly * 8}deg)`, zIndex: 40 }}><FileSpreadsheet size={46} color="#16a34a" />trial-balance.xlsx</div>}
  </AbsoluteFill>);
};

// ---------------------------------------------------------------- "Stop guessing your stock"
const SHook: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const at = useAt(s); const st = f - at('stop');
  return (<AbsoluteFill>
    <HookTitle k={f} lines={['Selling', 'products?', <span key="s" style={{ opacity: st >= 0 ? 1 : 0 }}>Stop <span style={LGRAD}>guessing</span></span>, <span key="t" style={{ opacity: st >= 0 ? 1 : 0 }}>your stock.</span>]} />
    <Screen srcs={[{ t: 0, src: img('products') }]} aspect={0.625} w={1000} enter={12} keys={[{ t: 0, x: 540, y: 1360, rx: 30, s: 0.95 }, { t: 125, y: 1265, rx: 16 }]} />
  </AbsoluteFill>);
};
const STrack: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { SX, SY, SW } = useLay(); const at = useAt(s); const h = at('hand'), c = at('cost'), lo = at('low');
  return (<AbsoluteFill>
    <Headline k={f} label="PRODUCTS & STOCK" title={<>Every item, <span style={LGRAD}>tracked.</span></>} sub="On hand, average cost and value." />
    <Screen srcs={[{ t: 0, src: img('products') }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -10 }, { t: h - 10, ry: 0, zoom: 1.1 }, { t: h + 6, zoom: 1.9, fx: 0.78, fy: 0.5 }, { t: lo, fx: 0.78, fy: 0.5 }, { t: lo + 14, zoom: 2.1, fx: 0.85, fy: 0.18 }]}
      marks={[{ t: h + 6, x: 0.735, y: 0.39, w: 0.058, h: 0.215, until: lo + 4 }, { t: c + 4, x: 0.81, y: 0.39, w: 0.065, h: 0.215, color: L.green, until: lo + 4 }, { t: lo + 14, x: 0.725, y: 0.112, w: 0.246, h: 0.13, color: L.amber }]} />
    <Callout k={f - lo - 20} x={0} y={0}><Dot color={L.amber}><AlertTriangle size={30} /></Dot>2 products low on stock</Callout>
  </AbsoluteFill>);
};
const SHistory: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { SX, SY, SW } = useLay(); const at = useAt(s); const sa = at('sale'), a = at('avg');
  return (<AbsoluteFill>
    <Headline k={f} label="STOCK HISTORY" title={<>Sales and deliveries, <span style={LGRAD}>counted.</span></>} sub="At average cost, automatically." />
    <Screen srcs={[{ t: 0, src: img('product') }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, zoom: 1.3, fx: 0.55, fy: 0.4 }, { t: sa + 6, zoom: 1.7, fx: 0.55, fy: 0.53 }, { t: a, fx: 0.55, fy: 0.53 }, { t: a + 14, zoom: 2.1, fx: 0.83, fy: 0.28 }]}
      marks={[{ t: sa + 12, x: 0.205, y: 0.48, w: 0.71, h: 0.04, color: L.red, until: a + 4 }, { t: sa + 18, x: 0.205, y: 0.52, w: 0.71, h: 0.04, color: L.green, until: a + 4 }, { t: a + 14, x: 0.747, y: 0.222, w: 0.17, h: 0.12 }]} />
    <Callout k={f - a - 20} x={0} y={0}><Dot color={L.blue}><Package size={30} /></Dot>Average cost R 146.00 a bag</Callout>
  </AbsoluteFill>);
};
const SPo: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { SX, SY, SW } = useLay(); const at = useAt(s); const r = at('raise'), b = at('bill'); const swap = r + 16;
  return (<AbsoluteFill>
    <Headline k={f} label="PURCHASE ORDERS" title={<>Order it. <span style={LGRAD}>Bill it.</span></>} sub="A purchase order becomes the bill when stock arrives." />
    <Screen srcs={[{ t: 0, src: img('products') }, { t: swap, src: img('po') }]} aspect={0.625} w={SW}
      keys={[{ t: 0, x: SX, y: SY, zoom: 1.9, fx: 0.8, fy: 0.12 }, { t: swap, zoom: 1.9, fx: 0.8, fy: 0.12 }, { t: swap + 1, zoom: 1.5, fx: 0.55, fy: 0.4 }, { t: b, zoom: 1.5 }, { t: b + 14, zoom: 2.0, fx: 0.72, fy: 0.1 }]}
      marks={[{ t: swap + 6, x: 0.206, y: 0.33, w: 0.71, h: 0.15, until: b + 4 }, { t: b + 14, x: 0.808, y: 0.042, w: 0.108, h: 0.042, color: L.green }, { t: b + 18, x: 0.302, y: 0.078, w: 0.036, h: 0.026, color: L.green }]}
      cursor={[{ t: r - 4, x: 0.7, y: 0.3 }, { t: r + 8, x: 0.826, y: 0.064 }, { t: swap, x: 0.826, y: 0.064 }, { t: b + 14, x: 0.862, y: 0.064 }]} clicks={[r + 10, b + 16]} />
    <Callout k={f - b - 24} x={0} y={0}><Dot color={L.green}><Receipt size={30} /></Dot>PO-0001 → bill HGB-5512</Callout>
  </AbsoluteFill>);
};
const SBooks: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { SX, SY, SW } = useLay(); const at = useAt(s); const a = at('agree');
  return (<AbsoluteFill>
    <Headline k={f} label="IN THE BOOKS" title={<>Stock that <span style={LGRAD}>adds up.</span></>} sub="Stock value agrees with the ledger." />
    <Screen srcs={[{ t: 0, src: img('products') }]} aspect={0.625} w={SW} keys={[{ t: 0, x: SX, y: SY, ry: -10, zoom: 1.2, fx: 0.4, fy: 0.3 }, { t: a, ry: 0 }, { t: a + 12, zoom: 2.3, fx: 0.33, fy: 0.18 }]}
      marks={[{ t: a + 12, x: 0.206, y: 0.112, w: 0.246, h: 0.13, color: L.green }]} />
    <Callout k={f - a - 20} x={0} y={0}><Dot color={L.green}><Scale size={30} /></Dot>R 12,448.00 · agrees with the ledger</Callout>
  </AbsoluteFill>);
};

const NUM = { hook: NHook, dash: NDash, why: NWhy, jobs: NJobs, hours: NHours, excel: NExcel } as const;
const STK = { hook: SHook, track: STrack, history: SHistory, po: SPo, books: SBooks } as const;
const make = (id: 'numbers' | 'stock', scenes: Record<string, React.FC<{ s: Scene }>>, endTitle: React.ReactNode, ticks: string[]): React.FC => () => {
  const v = (TL as unknown as Record<string, Video>)[id]; const { fps } = useVideoConfig();
  const cuts = v.scenes.slice(1).map((s) => Math.round(s.start * fps));
  return (<Vertical.Provider value={true}><AbsoluteFill style={{ background: L.bg }}><style>{fontFace}</style>
    {v.scenes.map((s) => { const Comp = scenes[s.id];
      return <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={Math.round(s.dur * fps) + 14}><LightBg />{Comp ? <Comp s={s} /> : <End s={s} title={endTitle} ticks={ticks} />}</Sequence>; })}
    <Wipes cuts={cuts} colors={['#2563eb', '#93c5fd', '#ffffff']} />
    <Captions video={v} top={1765} size={46} side={60} light /><Audio src={staticFile(`audio/${id}.wav`)} />
  </AbsoluteFill></Vertical.Provider>);
};
export const Numbers = make('numbers', NUM, <>Know your <span style={LGRAD}>numbers.</span></>, ['Profit', 'Insights', 'Projects', 'Time', 'Excel']);
export const Stock = make('stock', STK, <>Stock, <span style={LGRAD}>sorted.</span></>, ['On hand', 'Average cost', 'Low stock', 'Purchase orders']);
