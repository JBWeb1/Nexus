// Shared building blocks for the Nexus videos: timing helpers, background, captions, phone frame, effects.
import React from 'react';
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';

export type Scene = { id: string; start: number; dur: number; voiceAt: number; speech: number; cues: Record<string, number>; words: { w: string; t: number }[] };
export type Video = { title: string; fps: number; total: number; frames: number; scenes: Scene[] };

export const C = { bg: '#060d1d', ink: '#eef3ff', soft: '#9fb0cf', blue: '#3b82f6', blue2: '#7cb3ff', cyan: '#67e8f9', green: '#34d399', amber: '#fbbf24', red: '#f87171', line: 'rgba(255,255,255,.12)' };
export const FONT = 'Manrope, system-ui, sans-serif';
export const fontFace = `@font-face { font-family: Manrope; src: url(${staticFile('fonts/manrope.woff2')}) format("woff2"); font-weight: 200 800; }`;

/** Frames since a moment in the video (seconds, absolute), for a scene that starts at `sceneStart`. Negative before it. */
export const useSince = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return (t: number, sceneStart: number) => f - Math.round((t - sceneStart) * fps); };
/** A spring that starts at frame `from` (local). 0 → 1 with a little overshoot. */
export const useSpring = () => { const { fps } = useVideoConfig(); return (frame: number, cfg: Partial<{ damping: number; stiffness: number; mass: number }> = {}) => spring({ frame, fps, config: { damping: 14, stiffness: 160, mass: 0.8, ...cfg } }); };
export const ease = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.7, 0.2, 1) });

/** Deep navy, slowly drifting light, a faint grid. Calm, so the content carries the motion. */
export const Background: React.FC = () => {
  const f = useCurrentFrame(); const t = f / 30;
  return (<AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', width: 1500, height: 1500, left: -560 + Math.sin(t / 6) * 220, top: -260 + Math.cos(t / 8) * 180, background: 'radial-gradient(closest-side, rgba(37,99,235,.42), rgba(37,99,235,0))' }} />
    <div style={{ position: 'absolute', width: 1300, height: 1300, left: 260 + Math.cos(t / 7) * 200, top: 920 + Math.sin(t / 5) * 160, background: 'radial-gradient(closest-side, rgba(16,185,129,.18), rgba(16,185,129,0))' }} />
    <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse at 50% 45%, #000 25%, transparent 70%)' }} />
  </AbsoluteFill>);
};

export const Brand: React.FC<{ hidden?: boolean }> = ({ hidden }) => (
  <div style={{ position: 'absolute', top: 100, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, opacity: hidden ? 0 : 0.85, fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: '.16em', color: '#fff' }}>
    <Img src={staticFile('img/logo.png')} style={{ height: 46 }} />NEXUS LEDGER</div>);

/** Captions that pop in word by word as they are spoken, the current word lit up. Groups of up to 4 words. */
export const Captions: React.FC<{ video: Video; top?: number; size?: number; side?: number }> = ({ video, top = 1430, size = 66, side = 60 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const t = f / fps; const sp = useSpring();
  const groups: { w: string; t: number }[][] = [];
  for (const s of video.scenes) { let g: { w: string; t: number }[] = [];
    for (const w of s.words) { g.push(w); if (g.length === 4 || /[.,?!]$/.test(w.w)) { groups.push(g); g = []; } } if (g.length) groups.push(g); }
  const gi = groups.findIndex((g, i) => t >= g[0].t - 0.05 && (i + 1 >= groups.length || t < groups[i + 1][0].t - 0.05));
  if (gi < 0) return null; const g = groups[gi]; const last = g[g.length - 1];
  if (t > last.t + 1.4) return null; // nothing hangs on screen in the pauses
  return (<div style={{ position: 'absolute', left: side, right: side, top, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0 18px', fontFamily: FONT, fontSize: size, fontWeight: 800, letterSpacing: '-.01em', textAlign: 'center' }}>
    {g.map((w, i) => { const k = Math.round((t - w.t) * fps); const on = k >= 0; const cur = on && (i === g.length - 1 || t < g[i + 1].t);
      const s = on ? sp(k, { damping: 12, stiffness: 260 }) : 0;
      return <span key={i} style={{ display: 'inline-block', opacity: on ? 1 : 0, transform: `translateY(${(1 - s) * 18}px) scale(${0.85 + 0.15 * s})`, color: cur ? C.cyan : '#fff', textShadow: '0 4px 0 rgba(0,0,0,.55), 0 0 30px rgba(0,0,0,.6)', WebkitTextStroke: '2px rgba(2,6,18,.55)' }}>{w.w}</span>; })}
  </div>);
};

/** A phone showing a real screenshot of the app. `scroll` pans the screenshot up by that many pixels over `frames`. */
export const Phone: React.FC<{ src: string; x: number; y: number; w: number; h: number; scroll?: number; frames?: number; local?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ src, x, y, w, h, scroll = 0, frames = 1, local = 0, style, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 74, padding: 20, background: '#0b1220', boxShadow: '0 50px 140px -30px rgba(0,0,0,.85), 0 0 0 3px rgba(255,255,255,.14)', ...style }}>
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 56, overflow: 'hidden', background: '#f5f7fb' }}>
      <div style={{ position: 'absolute', top: 14, left: '50%', width: 150, height: 38, marginLeft: -75, borderRadius: 22, background: '#0b1220', zIndex: 3 }} />
      <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: `translateY(${-scroll * ease(local, 0, frames)}px)` }} />{children}</div></div>);

/** Small random shake that fades out, for impacts. */
export const shake = (k: number, amp = 26, dur = 14) => { if (k < 0 || k > dur) return 'translate(0,0)'; const d = 1 - k / dur; return `translate(${(random(`x${k}`) - 0.5) * 2 * amp * d}px, ${(random(`y${k}`) - 0.5) * 2 * amp * d}px)`; };
/** Red/blue split for a glitch, for `dur` frames from k=0. */
export const glitchShadow = (k: number, dur = 18) => { if (k < 0 || k > dur) return 'none'; const a = 10 * (1 - k / dur) * (random(`g${Math.floor(k / 2)}`) > 0.3 ? 1 : -1); return `${a}px 0 0 rgba(248,113,113,.9), ${-a}px 0 0 rgba(103,232,249,.9)`; };

/** Wraps a scene: it wipes in over the previous one, and settles back as the next arrives. */
export const SceneShell: React.FC<{ durFrames: number; enter?: 'wipe' | 'zoom' | 'slide' | 'none'; children: React.ReactNode }> = ({ durFrames, enter = 'wipe', children }) => {
  const f = useCurrentFrame(); const p = ease(f, 0, 14); const out = ease(f, durFrames - 2, durFrames + 12);
  const clip = enter === 'wipe' ? `circle(${p * 150}% at 50% 110%)` : 'none';
  const tf = enter === 'zoom' ? `scale(${1.12 - 0.12 * p})` : enter === 'slide' ? `translateY(${(1 - p) * 240}px)` : 'none';
  return (<AbsoluteFill style={{ color: C.ink, clipPath: clip, transform: `${tf} scale(${1 - 0.06 * out})`, opacity: enter === 'none' ? 1 : enter === 'wipe' ? 1 : p, filter: out > 0 ? `brightness(${1 - 0.5 * out})` : undefined }}>
    <Background />{children}</AbsoluteFill>);
};

export const Btn: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 18, padding: '30px 52px', borderRadius: 999, background: 'linear-gradient(90deg,#2563eb,#0ea5e9)', fontSize: 46, fontWeight: 800, color: '#fff', boxShadow: '0 24px 70px -12px rgba(37,99,235,.7)', fontFamily: FONT, ...style }}>{children}</div>);
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: 'rgba(255,255,255,.065)', border: `1px solid ${C.line}`, borderRadius: 36, fontFamily: FONT, color: C.ink, ...style }}>{children}</div>);
