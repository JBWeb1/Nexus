// Light "SaaS explainer" pieces: soft background, a browser window that tilts in 3D and zooms like a camera onto real
// screenshots of the app, a cursor that clicks through it, highlight boxes and callout cards.
// Positions inside a screenshot are fractions of its width and height (0..1), so they survive any display size.
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, useSpring } from './lib';

/** True inside the 9:16 (TikTok) versions; scenes read it through useLay(). */
export const Vertical = createContext(false);
export const useLay = () => { const V = useContext(Vertical); return V ? { V, SX: 540, SY: 1075, SW: 1000 } : { V, SX: 1270, SY: 530, SW: 1180 }; };

export const L = { bg: '#f4f7fd', ink: '#0f172a', soft: '#475569', blue: '#2563eb', sky: '#0ea5e9', green: '#059669', amber: '#d97706', red: '#dc2626', line: 'rgba(15,23,42,.08)' };
export const LGRAD = { background: 'linear-gradient(90deg,#2563eb,#0ea5e9)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as const;
const EASE = Easing.bezier(0.45, 0, 0.2, 1);

export const LightBg: React.FC = () => {
  const f = useCurrentFrame(); const t = f / 30;
  return (<AbsoluteFill style={{ background: 'linear-gradient(180deg,#f8fbff,#edf2fb)', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', width: 1300, height: 1300, left: -420 + Math.sin(t / 7) * 120, top: -520 + Math.cos(t / 9) * 90, background: 'radial-gradient(closest-side, rgba(59,130,246,.20), rgba(59,130,246,0))' }} />
    <div style={{ position: 'absolute', width: 1200, height: 1200, left: 1100 + Math.cos(t / 8) * 120, top: 300 + Math.sin(t / 6) * 90, background: 'radial-gradient(closest-side, rgba(16,185,129,.14), rgba(16,185,129,0))' }} />
    <div style={{ position: 'absolute', width: 900, height: 900, left: 600 + Math.sin(t / 5) * 80, top: 600, background: 'radial-gradient(closest-side, rgba(168,85,247,.10), rgba(168,85,247,0))' }} />
    <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(15,23,42,.08) 1.5px, transparent 1.7px)', backgroundSize: '34px 34px', maskImage: 'radial-gradient(ellipse at 50% 50%, #000 30%, transparent 80%)' }} />
  </AbsoluteFill>);
};

/** Keyframed values. Each key carries any subset of fields; missing fields hold the previous key's value. */
export type Key = { t: number; zoom?: number; fx?: number; fy?: number; rx?: number; ry?: number; x?: number; y?: number; s?: number };
const FIELDS = ['zoom', 'fx', 'fy', 'rx', 'ry', 'x', 'y', 's'] as const;
const DEF: Required<Omit<Key, 't'>> = { zoom: 1, fx: 0.5, fy: 0.5, rx: 0, ry: 0, x: 960, y: 540, s: 1 };
export function track(f: number, keys: Key[]) {
  const full: Required<Key>[] = []; let prev = { ...DEF };
  for (const k of keys) { prev = { ...prev, ...Object.fromEntries(Object.entries(k).filter(([n]) => n !== 't')) }; full.push({ t: k.t, ...prev }); }
  const out = { ...full[0] };
  for (const n of FIELDS) {
    if (f <= full[0].t) { out[n] = full[0][n]; continue; }
    const i = full.findIndex((k) => k.t > f); if (i < 0) { out[n] = full[full.length - 1][n]; continue; }
    const a = full[i - 1], b = full[i]; out[n] = interpolate(f, [a.t, b.t], [a[n], b[n]], { easing: EASE });
  }
  return out;
}

export type Mark = { t: number; x: number; y: number; w: number; h: number; color?: string; until?: number };
export type Pt = { t: number; x: number; y: number };

const Cursor: React.FC<{ pts: Pt[]; clicks: number[]; zoom: number; W: number; H: number }> = ({ pts, clicks, zoom, W, H }) => {
  const f = useCurrentFrame(); if (!pts.length || f < pts[0].t - 6) return null;
  const i = pts.findIndex((p) => p.t > f); const a = i <= 0 ? pts[i < 0 ? pts.length - 1 : 0] : pts[i - 1], b = i <= 0 ? a : pts[i];
  const k = a === b ? 0 : interpolate(f, [a.t, b.t], [0, 1], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = (a.x + (b.x - a.x) * k) * W, y = (a.y + (b.y - a.y) * k) * H;
  const c = clicks.map((t) => f - t).filter((d) => d >= 0 && d < 18).sort((p, q) => p - q)[0];
  const press = c !== undefined && c < 5 ? 0.82 : 1; const fade = interpolate(f, [pts[0].t - 6, pts[0].t], [0, 1], { extrapolateRight: 'clamp' });
  return (<div style={{ position: 'absolute', left: x, top: y, transform: `scale(${1 / zoom})`, transformOrigin: '0 0', zIndex: 20, opacity: fade }}>
    {c !== undefined && <div style={{ position: 'absolute', left: -40, top: -40, width: 80, height: 80, borderRadius: '50%', border: '4px solid rgba(37,99,235,.7)', background: 'rgba(37,99,235,.12)', transform: `scale(${0.3 + c / 10})`, opacity: 1 - c / 18 }} />}
    <svg width="46" height="52" viewBox="0 0 23 26" style={{ transform: `scale(${press})`, transformOrigin: '0 0', filter: 'drop-shadow(0 4px 6px rgba(15,23,42,.35))' }}>
      <path d="M1 1 L1 20 L6 15.5 L9.5 23.5 L13 22 L9.6 14.2 L16 14.2 Z" fill="#0f172a" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
  </div>);
};

/** A browser window showing app screenshots. `srcs` swap at their frame with a quick crossfade. */
export const Screen: React.FC<{ srcs: { t: number; src: string }[]; aspect: number; w: number; keys: Key[]; cursor?: Pt[]; clicks?: number[]; marks?: Mark[]; enter?: number; chrome?: boolean }> = ({ srcs, aspect, w, keys, cursor = [], clicks = [], marks = [], enter = 0, chrome = true }) => {
  const f = useCurrentFrame(); const sp = useSpring(); const v = track(f, keys); const W = w, H = w * aspect; const bar = chrome ? 44 : 0;
  // In the vertical version the window is taller than the page, so the page is drawn bigger to fill it (a closer camera).
  const VH = useContext(Vertical) ? Math.max(H, Math.round(w * 0.86)) : H; const z = v.zoom * (VH / H);
  const tx = Math.min(0, Math.max(W - W * z, W / 2 - v.fx * W * z)), ty = Math.min(0, Math.max(VH - H * z, VH / 2 - v.fy * H * z));
  const p = sp(f - enter, { damping: 15, stiffness: 120 });
  return (<div style={{ position: 'absolute', left: v.x - W / 2, top: v.y - (VH + bar) / 2, width: W, height: VH + bar, perspective: 2400 }}>
    <div style={{ width: '100%', height: '100%', borderRadius: 22, overflow: 'hidden', background: '#fff', boxShadow: '0 60px 120px -30px rgba(15,23,42,.35), 0 0 0 1px rgba(15,23,42,.06)', transform: `translateY(${(1 - p) * 260}px) rotateX(${v.rx + (1 - p) * 20}deg) rotateY(${v.ry}deg) scale(${v.s * (0.9 + 0.1 * p)})`, opacity: Math.min(1, p * 1.6) }}>
      {chrome && <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: '#fff', borderBottom: `1px solid ${L.line}` }}>
        {['#f87171', '#fbbf24', '#34d399'].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: '50%', background: c }} />)}
        <div style={{ marginLeft: 'auto', marginRight: 'auto', padding: '6px 60px', borderRadius: 9, background: '#f1f5f9', fontFamily: FONT, fontSize: 15, fontWeight: 700, color: L.soft }}>Nexus Ledger</div><div style={{ width: 60 }} /></div>}
      <div style={{ position: 'relative', width: W, height: VH, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
          {srcs.map((s, i) => { const next = srcs[i + 1]; const op = i === 0 ? 1 : interpolate(f, [s.t, s.t + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            if (f < s.t - 1 && i > 0) return null; if (next && f > next.t + 8) return null;
            return <Img key={s.src} src={staticFile(s.src)} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: op }} />; })}
          {marks.map((m, i) => { const k = f - m.t; if (k < 0 || (m.until !== undefined && f > m.until)) return null; const q = sp(k, { damping: 12, stiffness: 200 }); const glow = 0.5 + 0.5 * Math.sin(k / 6);
            return <div key={i} style={{ position: 'absolute', left: m.x * W, top: m.y * H, width: m.w * W, height: m.h * H, borderRadius: 10 / z + 4, border: `${3 / z}px solid ${m.color || L.blue}`, background: 'rgba(37,99,235,.06)', boxShadow: `0 0 ${(14 + 14 * glow) / z}px ${m.color || L.blue}66`, transform: `scale(${1.25 - 0.25 * q})`, opacity: Math.min(1, q * 1.5) }} />; })}
          <Cursor pts={cursor} clicks={clicks} zoom={z} W={W} H={H} />
        </div>
      </div>
    </div>
  </div>);
};

/** A phone showing a screenshot, with an optional cursor tap and overlay drawn in screenshot fractions. */
export const LPhone: React.FC<{ src: string; aspect: number; w: number; x: number; y: number; cursor?: Pt[]; clicks?: number[]; enter?: number; children?: (W: number, H: number) => React.ReactNode }> = ({ src, aspect, w, x, y, cursor = [], clicks = [], enter = 0, children }) => {
  const f = useCurrentFrame(); const sp = useSpring(); const W = w, H = w * aspect; const p = sp(f - enter, { damping: 15, stiffness: 120 });
  return (<div style={{ position: 'absolute', left: x - W / 2 - 16, top: y - H / 2 - 16, width: W + 32, height: H + 32, borderRadius: 64, padding: 16, background: '#0f172a', boxShadow: '0 60px 120px -30px rgba(15,23,42,.45)', transform: `translateY(${(1 - p) * 300}px) rotate(${(1 - p) * 8}deg)`, opacity: Math.min(1, p * 1.6) }}>
    <div style={{ position: 'relative', width: W, height: H, borderRadius: 48, overflow: 'hidden', background: '#f5f7fb' }}>
      <Img src={staticFile(src)} style={{ width: W, height: H }} />{children?.(W, H)}<Cursor pts={cursor} clicks={clicks} zoom={1} W={W} H={H} /></div></div>);
};

/** White card that pops out with a soft shadow. */
export const Callout: React.FC<{ k: number; x: number; y: number; vy?: number; children: React.ReactNode; from?: 'left' | 'right' | 'up'; style?: React.CSSProperties }> = ({ k, x, y, vy = 1560, children, from = 'up', style }) => {
  const sp = useSpring(); const V = useContext(Vertical); if (k < 0) return null; const q = sp(k, { damping: 12, stiffness: 180 });
  const d = from === 'left' ? `translateX(${(1 - q) * -80}px)` : from === 'right' ? `translateX(${(1 - q) * 80}px)` : `translateY(${(1 - q) * 50}px)`;
  const card = <div style={{ position: V ? 'relative' : 'absolute', left: V ? undefined : x, top: V ? undefined : y, whiteSpace: V ? 'nowrap' : undefined, display: 'flex', alignItems: 'center', gap: 16, padding: '20px 28px', borderRadius: 22, background: '#fff', boxShadow: '0 30px 60px -18px rgba(15,23,42,.30), 0 0 0 1px rgba(15,23,42,.05)', fontFamily: FONT, fontSize: 28, fontWeight: 800, color: L.ink, transform: `${d} scale(${0.7 + 0.3 * q})`, opacity: Math.min(1, q * 1.5), zIndex: 30, ...style, ...(V ? { fontSize: 34 } : {}) }}>{children}</div>;
  return V ? <div style={{ position: 'absolute', left: 0, right: 0, top: vy, display: 'flex', justifyContent: 'center', zIndex: 30 }}>{card}</div> : card;
};

/** Round icon chip for callouts. */
export const Dot: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <div style={{ width: 52, height: 52, borderRadius: 16, display: 'grid', placeItems: 'center', background: `${color}1f`, color, flex: 'none' }}>{children}</div>);

/** Left column: small coloured label, a big dark headline, an optional line under it. */
export const Headline: React.FC<{ k: number; label: string; title: React.ReactNode; sub?: string; x?: number; y?: number; width?: number; center?: boolean }> = (props) => {
  const V = useContext(Vertical); const { k, label, title, sub } = props;
  const center = V || !!props.center, x = V ? 60 : props.x ?? 100, width = V ? 960 : props.width ?? 540, y = V ? (props.center ? (props.y ?? 290) + 110 : 165) : props.y ?? 290;
  const e = (a: number, b: number) => interpolate(k, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.7, 0.2, 1) });
  return (<div style={{ position: 'absolute', left: x, top: y, width, fontFamily: FONT, textAlign: center ? 'center' : 'left' }}>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 999, background: 'rgba(37,99,235,.1)', color: L.blue, fontSize: 22, fontWeight: 800, letterSpacing: '.08em', opacity: e(0, 8), transform: `translateY(${(1 - e(0, 8)) * 14}px)` }}>{label}</div>
    <div style={{ marginTop: 22, fontSize: V ? 82 : 74, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.04, color: L.ink, overflow: 'hidden', paddingBottom: 8 }}><div style={{ transform: `translateY(${(1 - e(3, 18)) * 110}%)` }}>{title}</div></div>
    {sub && <div style={{ marginTop: 18, fontSize: V ? 33 : 30, fontWeight: 600, lineHeight: 1.4, color: L.soft, opacity: e(12, 24), transform: `translateY(${(1 - e(12, 24)) * 16}px)` }}>{sub}</div>}
  </div>);
};

/** The logo on a navy app-icon tile, so the white wordmark reads on light backgrounds. */
export const LogoTile: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.24, background: 'linear-gradient(160deg,#0b1730,#060d1d)', display: 'grid', placeItems: 'center', boxShadow: `0 ${size * 0.15}px ${size * 0.35}px -${size * 0.1}px rgba(15,23,42,.45)`, ...style }}>
    <Img src={staticFile('img/logo.png')} style={{ width: size * 0.78 }} /></div>);
