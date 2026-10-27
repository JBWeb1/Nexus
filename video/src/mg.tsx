// Motion-graphics pieces for the pitch and lead videos: masked word reveals, line drawing, panel wipes, counters.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C, FONT, ease, useSpring } from './lib';

export const GRAD = { background: 'linear-gradient(90deg,#7cb3ff,#67e8f9 55%,#6ee7b7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as const;

/** Words rise out of a mask one after another, starting at local frame `k` = 0. `accent` colours words by index. */
export const Words: React.FC<{ text: string; k: number; size: number; stagger?: number; weight?: number; accent?: Record<number, React.CSSProperties>; style?: React.CSSProperties; align?: 'left' | 'center' }> = ({ text, k, size, stagger = 3, weight = 800, accent = {}, style, align = 'center' }) => (
  <div style={{ fontFamily: FONT, fontSize: size, fontWeight: weight, letterSpacing: '-.04em', lineHeight: 1.08, color: '#fff', display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.26}px`, ...style }}>
    {text.split(' ').map((w, i) => { const p = ease(k - i * stagger, 0, 14);
      return <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
        <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`, ...accent[i] }}>{w}</span></span>; })}
  </div>);

/** An SVG path that draws itself over `dur` frames from local frame `k` = 0. */
export const Draw: React.FC<{ d: string; k: number; dur?: number; len?: number; stroke?: string; width?: number; size: [number, number]; style?: React.CSSProperties; fill?: string }> = ({ d, k, dur = 20, len = 3000, stroke = C.cyan, width = 6, size, style, fill = 'none' }) => {
  const p = ease(k, 0, dur);
  return <svg width={size[0]} height={size[1]} viewBox={`0 0 ${size[0]} ${size[1]}`} style={{ position: 'absolute', overflow: 'visible', ...style }}>
    <path d={d} fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} /></svg>;
};

/** A ring that draws round from the top. */
export const Ring: React.FC<{ k: number; r: number; dur?: number; stroke?: string; width?: number; x: number; y: number; rotate?: number }> = ({ k, r, dur = 22, stroke = C.cyan, width = 6, x, y, rotate = 0 }) => {
  const c = 2 * Math.PI * r; const p = ease(k, 0, dur);
  return <svg width={r * 2 + width * 2} height={r * 2 + width * 2} style={{ position: 'absolute', left: x - r - width, top: y - r - width, transform: `rotate(${rotate - 90}deg)`, overflow: 'visible' }}>
    <circle cx={r + width} cy={r + width} r={r} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} /></svg>;
};

/** Counts from 0 to `to` between local frames `a` and `b`. */
export const count = (k: number, to: number, a = 0, b = 30, digits = 0) => (to * ease(k, a, b)).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Three coloured panels sweep across at every scene cut, covering the hard cut. `cuts` are frames. */
export const Wipes: React.FC<{ cuts: number[] }> = ({ cuts }) => {
  const f = useCurrentFrame(); const { width, height } = useVideoConfig();
  const cut = cuts.find((c) => f >= c - 12 && f <= c + 14); if (cut === undefined) return null;
  const cols = ['#2563eb', '#67e8f9', '#34d399'];
  return (<AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
    {cols.map((col, i) => { const k = f - (cut - 12) - i * 2;
      const x = interpolate(k, [0, 12, 24], [-1.4, 0, 1.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.7, 0, 0.3, 1) });
      return <div key={i} style={{ position: 'absolute', top: -height * 0.2, height: height * 1.4, left: -width * 0.25, width: width * 1.5, background: col, transform: `translateX(${x * width}px) skewX(-14deg)`, opacity: i === 2 ? 1 : 0.95 }} />; })}
  </AbsoluteFill>);
};

/** Small floating shapes (rings and plus signs) for depth. */
export const Floaters: React.FC<{ seed?: number }> = ({ seed = 0 }) => {
  const f = useCurrentFrame(); const { width, height } = useVideoConfig();
  return (<AbsoluteFill style={{ pointerEvents: 'none' }}>
    {Array.from({ length: 9 }).map((_, i) => { const x = ((i * 397 + seed * 131) % 100) / 100 * width, y = ((i * 211 + seed * 71) % 100) / 100 * height; const dy = Math.sin(f / 40 + i) * 18; const rot = f * (i % 2 ? 0.4 : -0.3);
      return i % 3 === 0
        ? <div key={i} style={{ position: 'absolute', left: x, top: y + dy, width: 26, height: 26, transform: `rotate(${rot}deg)`, opacity: 0.25 }}><div style={{ position: 'absolute', left: 11, top: 0, width: 4, height: 26, background: C.cyan }} /><div style={{ position: 'absolute', top: 11, left: 0, height: 4, width: 26, background: C.cyan }} /></div>
        : <div key={i} style={{ position: 'absolute', left: x, top: y + dy, width: 18 + (i % 4) * 10, height: 18 + (i % 4) * 10, borderRadius: '50%', border: `3px solid ${i % 2 ? C.blue2 : C.green}`, opacity: 0.18 }} />; })}
  </AbsoluteFill>);
};

/** Small source line, bottom-left of a scene. */
export const Source: React.FC<{ children: React.ReactNode; k?: number; bottom?: number; left?: number }> = ({ children, k = 30, bottom = 36, left = 60 }) => (
  <div style={{ position: 'absolute', left, bottom, fontFamily: FONT, fontSize: 22, fontWeight: 600, color: 'rgba(159,176,207,.75)', opacity: ease(k, 0, 10) }}>{children}</div>);

export const Pill: React.FC<{ children: React.ReactNode; p?: number; style?: React.CSSProperties; color?: string }> = ({ children, p = 1, style, color = C.line }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '16px 28px', borderRadius: 999, background: 'rgba(255,255,255,.07)', border: `2px solid ${color}`, fontFamily: FONT, fontSize: 34, fontWeight: 800, color: '#fff', transform: `scale(${p})`, opacity: Math.min(1, p * 1.5), ...style }}>{children}</div>);

export { useSpring };
