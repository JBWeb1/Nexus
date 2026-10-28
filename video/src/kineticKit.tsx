// Kinetic typography for 9:16: each spoken beat is a full-screen card of huge words on a colour that flips every beat.
// A scene is a list of beats; each beat starts on its cue (the moment the words are spoken) and lasts until the next.
import React from 'react';
import { AbsoluteFill, Img, Sequence, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, ease, shake, useSpring, type Scene } from './lib';

export const K = { dark: '#05070d', blue: '#2563eb', cyan: '#22d3ee', white: '#f8fafc', green: '#10b981', red: '#ef4444', amber: '#f59e0b', navy: '#0b1736' };
const LIGHT = new Set([K.white, K.cyan, K.amber]);
export const KGRAD = { background: 'linear-gradient(90deg,#60a5fa,#22d3ee 55%,#34d399)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as const;

export type Beat = {
  cue: string; text?: string; bg?: string; ink?: string; fx?: 'slam' | 'rise' | 'split' | 'stamp' | 'zoom';
  shape?: 'ring' | 'bars' | 'burst' | 'stripes' | 'slips' | 'none'; accent?: Record<number, React.CSSProperties>; size?: number;
  /** Something drawn under the words (an app shot, an icon); the words move up to make room. */
  shot?: React.ReactNode; top?: number; shake?: boolean;
};

const Shape: React.FC<{ kind: Beat['shape']; k: number; color: string; seed: number }> = ({ kind, k, color, seed }) => {
  if (!kind || kind === 'none') return null;
  if (kind === 'ring') return <>{[0, 6].map((d) => <div key={d} style={{ position: 'absolute', left: 540 - 300, top: 960 - 300, width: 600, height: 600, borderRadius: '50%', border: `${14 - d}px solid ${color}`, transform: `scale(${ease(k - d, 0, 16, 0.2, 2.6)})`, opacity: 1 - ease(k - d, 4, 18) }} />)}</>;
  if (kind === 'burst') return <>{Array.from({ length: 14 }).map((_, i) => { const a = (i / 14) * Math.PI * 2; const d0 = 280 + ease(k, 0, 12) * 220;
    return <div key={i} style={{ position: 'absolute', left: 540 + Math.cos(a) * d0 - 6, top: 960 + Math.sin(a) * d0 - 40, width: 12, height: 80, borderRadius: 6, background: color, transform: `rotate(${(a * 180) / Math.PI + 90}deg) scaleY(${1 - ease(k, 6, 16)})` }} />; })}</>;
  if (kind === 'bars') return <>{[0, 1, 2].map((i) => <div key={i} style={{ position: 'absolute', left: -400, top: 520 + i * 340, width: 1900, height: 90, background: color, opacity: 0.22, transform: `rotate(-14deg) translateX(${(1 - ease(k - i * 2, 0, 12)) * (i % 2 ? 1800 : -1800)}px)` }} />)}</>;
  if (kind === 'stripes') return <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(-30deg, ${color}22 0 40px, transparent 40px 80px)`, backgroundPosition: `${k * 6}px 0` }} />;
  if (kind === 'slips') return <>{Array.from({ length: 12 }).map((_, i) => { const x = random(`sx${seed}${i}`) * 900 + 40, d = ease(k - i * 1.5, 0, 14), r = (random(`sr${seed}${i}`) - 0.5) * 80;
    return <div key={i} style={{ position: 'absolute', left: x - 90, top: -300 + d * (1300 + random(`sy${seed}${i}`) * 400), width: 180, height: 240, background: '#fff', borderRadius: 6, boxShadow: '0 12px 30px rgba(0,0,0,.25)', transform: `rotate(${r * d}deg)`, padding: 20 }}>
      {[0, 1, 2, 3, 4].map((l) => <div key={l} style={{ height: 9, margin: '13px 0', borderRadius: 5, width: `${50 + random(`sl${seed}${i}${l}`) * 50}%`, background: '#cbd5e1' }} />)}</div>; })}</>;
  return null;
};

const Words: React.FC<{ b: Beat; k: number; ink: string }> = ({ b, k, ink }) => {
  const sp = useSpring(); const lines = (b.text || '').split('|'); const maxLen = Math.max(...lines.map((l) => l.length));
  const size = Math.min(b.size ?? 250, 980 / (maxLen * 0.7)); const fx = b.fx ?? 'slam';
  const block = (children: React.ReactNode, i: number) => <div key={i} style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 0.98, letterSpacing: '-.045em', color: ink, textAlign: 'center', whiteSpace: 'nowrap', ...(b.accent?.[i] || {}) }}>{children}</div>;
  let inner: React.ReactNode;
  if (fx === 'rise') inner = lines.map((l, i) => <div key={i} style={{ overflow: 'hidden', paddingBottom: size * 0.06 }}><div style={{ transform: `translateY(${(1 - ease(k - i * 3, 0, 9)) * 105}%)` }}>{block(l, i)}</div></div>);
  else if (fx === 'split') inner = lines.map((l, i) => block(l.split('').map((ch, j) => { const q = sp(k - j * 1 - i * 3, { damping: 11, stiffness: 260 });
    return <span key={j} style={{ display: 'inline-block', transform: `translateY(${(1 - q) * -140}px) rotate(${(1 - q) * (j % 2 ? 25 : -25)}deg)`, opacity: Math.min(1, q * 2), whiteSpace: 'pre' }}>{ch}</span>; }), i));
  else if (fx === 'stamp') { const q = sp(k, { damping: 9, stiffness: 260 });
    inner = <div style={{ border: `${size * 0.06}px solid ${b.accent?.[0]?.color || ink}`, borderRadius: size * 0.12, padding: `${size * 0.08}px ${size * 0.2}px`, transform: `scale(${2.2 - 1.2 * q}) rotate(-6deg)`, opacity: Math.min(1, q * 2) }}>{lines.map((l, i) => block(l, i))}</div>; }
  else if (fx === 'zoom') { const q = ease(k, 0, 10); inner = <div style={{ transform: `scale(${0.4 + 0.6 * q})`, opacity: q }}>{lines.map((l, i) => block(l, i))}</div>; }
  else { const q = sp(k, { damping: 10, stiffness: 240 }); inner = <div style={{ transform: `scale(${1.9 - 0.9 * q})`, opacity: Math.min(1, k / 2) }}>{lines.map((l, i) => block(l, i))}</div>; }
  return <div style={{ transform: b.shake || fx === 'slam' ? shake(k, b.shake ? 28 : 12, 10) : undefined }}>{inner}</div>;
};

/** One beat, full screen. `k` counts frames from when its words are spoken. */
const BeatCard: React.FC<{ b: Beat; seed: number; len: number }> = ({ b, seed, len }) => {
  const k = useCurrentFrame(); const bg = b.bg ?? K.dark; const ink = b.ink ?? (LIGHT.has(bg) ? K.dark : '#fff');
  const accentShape = bg === K.dark || bg === K.navy ? K.blue : bg === K.white ? K.blue : bg === K.blue ? K.cyan : '#ffffff';
  const push = 1 + 0.035 * (k / Math.max(1, len));
  return (<AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
    <Shape kind={b.shape ?? 'none'} k={k} color={accentShape} seed={seed} />
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      {b.text && <div style={{ position: 'absolute', left: 0, right: 0, top: b.shot ? (b.top ?? 230) : '50%', transform: b.shot ? undefined : 'translateY(-50%)', display: 'flex', justifyContent: 'center' }}><Words b={b} k={k} ink={ink} /></div>}
      {b.shot}
    </AbsoluteFill>
    {(b.fx ?? 'slam') === 'slam' && <AbsoluteFill style={{ background: '#fff', opacity: ease(k, 0, 4, 0.35, 0) }} />}
  </AbsoluteFill>);
};

/** A scene: its beats, back to back, each in its own Sequence so anything inside counts frames from the beat. */
export const KScene: React.FC<{ s: Scene; beats: Beat[]; seed?: number }> = ({ s, beats, seed = 0 }) => {
  const { fps } = useVideoConfig(); const dur = Math.round(s.dur * fps);
  const starts = beats.map((b, i) => (i === 0 ? 0 : Math.max(0, Math.round((s.cues[b.cue] - s.start) * fps) - 1)));
  return (<AbsoluteFill>{beats.map((b, i) => { const from = starts[i], to = i + 1 < beats.length ? starts[i + 1] : dur;
    // The first beat waits for its words, but its colour is already on screen.
    const delay = i === 0 ? Math.max(0, Math.round((s.cues[b.cue] - s.start) * fps) - 1) : 0;
    return <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}><Sequence from={delay}><BeatCard b={b} seed={seed * 10 + i} len={to - from - delay} /></Sequence>
      {delay > 0 && <Sequence durationInFrames={delay}><AbsoluteFill style={{ background: b.bg ?? K.dark }} /></Sequence>}</Sequence>; })}</AbsoluteFill>);
};

/** A cropped, tilted app shot that punches in under the words. */
export const Shot: React.FC<{ src: string; aspect: number; fx: number; fy: number; zoom: number; y?: number; w?: number; h?: number; mark?: [number, number, number, number]; markColor?: string }> = ({ src, aspect, fx, fy, zoom, y = 1180, w = 900, h = 760, mark, markColor = K.green }) => {
  const k = useCurrentFrame(); const sp = useSpring(); const q = sp(k - 2, { damping: 13, stiffness: 170 });
  const W = 1000 * zoom, H = W * aspect; const z = zoom * (1 + 0.06 * ease(k, 0, 60));
  const IW = 1000 * z, IH = IW * aspect; const tx = Math.min(0, Math.max(w - IW, w / 2 - fx * IW)), ty = Math.min(0, Math.max(h - IH, h / 2 - fy * IH));
  void W; void H;
  return (<div style={{ position: 'absolute', left: 540 - w / 2, top: y - h / 2, width: w, height: h, perspective: 2000 }}>
    <div style={{ width: '100%', height: '100%', borderRadius: 40, overflow: 'hidden', background: '#fff', boxShadow: '0 50px 120px -20px rgba(0,0,0,.55), 0 0 0 6px rgba(255,255,255,.9)', transform: `translateY(${(1 - q) * 500}px) rotateX(${(1 - q) * 30}deg) rotate(${(1 - q) * -6 - 2}deg)`, opacity: Math.min(1, q * 1.5), position: 'relative' }}>
      <Img src={staticFile(src)} style={{ position: 'absolute', left: tx, top: ty, width: IW, height: IH }} />
      {mark && <div style={{ position: 'absolute', left: tx + mark[0] * IW, top: ty + mark[1] * IH, width: mark[2] * IW, height: mark[3] * IH, borderRadius: 14, border: `6px solid ${markColor}`, boxShadow: `0 0 30px ${markColor}`, transform: `scale(${1.3 - 0.3 * sp(k - 10)})`, opacity: ease(k, 8, 14) }} />}
    </div></div>);
};

/** A big icon tile that drops in under the words. */
export const IconTile: React.FC<{ children: React.ReactNode; bg: string; y?: number }> = ({ children, bg, y = 1150 }) => {
  const k = useCurrentFrame(); const sp = useSpring(); const q = sp(k - 2, { damping: 10, stiffness: 200 });
  return <div style={{ position: 'absolute', left: 540 - 170, top: y - 170, width: 340, height: 340, borderRadius: 90, background: bg, display: 'grid', placeItems: 'center', boxShadow: '0 40px 90px -20px rgba(0,0,0,.5)', transform: `scale(${q}) rotate(${(1 - q) * -40}deg)` }}>{children}</div>;
};

/** Logo beat: the glowing logo on black with a light sweep. */
export const LogoBeat: React.FC = () => {
  const k = useCurrentFrame(); const sp = useSpring(); const q = sp(k, { damping: 11 });
  return (<AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ position: 'absolute', width: 1100, height: 1100, background: 'radial-gradient(closest-side, rgba(37,99,235,.45), rgba(37,99,235,0))', transform: `scale(${0.6 + 0.4 * q})` }} />
    <Img src={staticFile('img/logo-social.png')} style={{ width: 860, transform: `scale(${1.3 - 0.3 * q})`, opacity: Math.min(1, k / 4) }} />
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(110deg, transparent ${ease(k, 4, 24) * 140 - 30}%, rgba(255,255,255,.22) ${ease(k, 4, 24) * 140 - 15}%, transparent ${ease(k, 4, 24) * 140}%)` }} />
  </AbsoluteFill>);
};
