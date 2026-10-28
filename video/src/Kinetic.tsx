// Two kinetic-typography TikToks. The hook lands in the first seconds; every spoken beat is its own full-screen card.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Mail, MessageCircle, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import TL from './timeline.json';
import { FONT, fontFace, useSpring, type Scene, type Video } from './lib';
import { LPhone } from './explainer';
import { IconTile, K, KGRAD, KScene, LogoBeat, Shot, type Beat } from './kineticKit';

const RED = { color: K.red }, GREEN = { color: K.green };

/** Last beat: free-trial button that pulses on the beat. */
const Cta: React.FC = () => { const k = useCurrentFrame(); const sp = useSpring();
  return <div style={{ position: 'absolute', left: 0, right: 0, top: 1180, display: 'flex', justifyContent: 'center', transform: `scale(${sp(k - 6) * (1 + 0.04 * Math.abs(Math.sin((k * Math.PI) / 15)))})` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '36px 66px', borderRadius: 999, background: '#fff', color: K.blue, fontFamily: FONT, fontSize: 60, fontWeight: 800, boxShadow: '0 30px 80px -20px rgba(0,0,0,.5)' }}>Start free<ArrowRight size={64} /></div></div>; };
const Checks: React.FC<{ items: string[] }> = ({ items }) => { const k = useCurrentFrame(); const sp = useSpring();
  return <div style={{ position: 'absolute', left: 120, right: 120, top: 880, display: 'flex', flexDirection: 'column', gap: 26 }}>
    {items.map((t, i) => { const q = sp(k - 4 - i * 4, { damping: 11 }); return <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '28px 36px', borderRadius: 30, background: 'rgba(255,255,255,.16)', fontFamily: FONT, fontSize: 50, fontWeight: 800, color: '#fff', transform: `translateX(${(1 - q) * 700}px)`, opacity: q }}>
      <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center' }}><Check size={44} color={K.green} strokeWidth={3.4} /></div>{t}</div>; })}</div>; };

const PortalTap: React.FC = () => <LPhone src="img/app/portal-phone.png" aspect={2.167} w={470} x={540} y={1190} enter={-14} cursor={[{ t: 0, x: 0.6, y: 0.6 }, { t: 9, x: 0.82, y: 0.322 }]} clicks={[11]} />;

const CHASE: Record<string, Beat[]> = {
  hook: [
    { cue: 'b1', text: 'STILL', bg: K.dark, fx: 'slam', shape: 'ring' },
    { cue: 'b2', text: 'CHASING', bg: K.blue, fx: 'split', shape: 'bars' },
    { cue: 'b3', text: 'CLIENTS', bg: K.white, fx: 'rise' },
    { cue: 'b4', text: 'TO PAY|YOU?', bg: K.dark, fx: 'slam', accent: { 1: KGRAD } },
    { cue: 'b5', text: 'EVERY.', bg: K.amber, fx: 'stamp' },
    { cue: 'b6', text: 'SINGLE.', bg: K.dark, fx: 'stamp' },
    { cue: 'b7', text: 'MONTH?', bg: K.red, fx: 'slam', shake: true, shape: 'burst' }],
  stop: [
    { cue: 'b1', text: 'STOP.', bg: K.white, fx: 'stamp', accent: { 0: RED }, size: 300 },
    { cue: 'b2', text: 'LET|NEXUS', bg: K.dark, fx: 'rise', accent: { 1: KGRAD } },
    { cue: 'b3', text: 'CHASE THEM|FOR YOU.', bg: K.blue, fx: 'slam', shape: 'ring' }],
  remind: [
    { cue: 'b1', text: 'REMINDERS', bg: K.dark, fx: 'split', shape: 'stripes' },
    { cue: 'b2', text: 'ON THEIR|OWN.', bg: K.white, fx: 'rise', size: 170, shot: <Shot src="img/app/reminders.png" aspect={0.79} fx={0.6} fy={0.82} zoom={1.6} mark={[0.77, 0.75, 0.2, 0.21]} /> },
    { cue: 'b3', text: "BEFORE|IT'S DUE", bg: K.blue, fx: 'rise' },
    { cue: 'b4', text: 'ON THE|DAY', bg: K.cyan, fx: 'slam' },
    { cue: 'b5', text: 'AND|AFTER.', bg: K.dark, fx: 'slam', shape: 'ring' }],
  channel: [
    { cue: 'b1', text: 'EMAIL', bg: K.white, fx: 'slam', top: 330, shot: <IconTile bg={K.blue}><Mail size={190} color="#fff" /></IconTile> },
    { cue: 'b2', text: 'WHATSAPP', bg: '#16a34a', fx: 'split', top: 330, shot: <IconTile bg="#fff"><MessageCircle size={190} color="#16a34a" /></IconTile> }],
  pay: [
    { cue: 'b1', text: 'YOUR|CUSTOMER', bg: K.dark, fx: 'rise' },
    { cue: 'b2', text: 'TAPS THE|LINK', bg: K.white, fx: 'slam', size: 130, top: 120, shot: <PortalTap /> },
    { cue: 'b3', text: 'PAYS|ONLINE.', bg: K.blue, fx: 'slam', shape: 'burst' }],
  paid: [
    { cue: 'b1', text: 'AND|YOU?', bg: K.dark, fx: 'zoom' },
    { cue: 'b2', text: 'YOU|JUST', bg: K.white, fx: 'rise' },
    { cue: 'b3', text: 'GET|PAID.', bg: K.green, fx: 'slam', shake: true, shape: 'burst', size: 300 }],
  end: [
    { cue: 'b1', bg: '#000', shot: <LogoBeat />, fx: 'zoom' },
    { cue: 'b2', text: 'TRY IT FREE|14 DAYS', bg: K.blue, fx: 'rise', top: 560, shot: <Cta /> }],
};

const SORTED: Record<string, Beat[]> = {
  hook: [
    { cue: 'b1', text: 'MONTH|END.', bg: K.dark, fx: 'slam', shape: 'ring' },
    { cue: 'b2', text: 'A PILE OF|SLIPS.', bg: K.white, fx: 'rise', shape: 'slips' },
    { cue: 'b3', text: 'A BANK|STATEMENT.', bg: K.blue, fx: 'split' },
    { cue: 'b4', text: 'AND VAT|DUE.', bg: K.red, fx: 'slam', shake: true, shape: 'burst' }],
  q: [{ cue: 'b1', text: 'SOUND|FAMILIAR?', bg: K.amber, fx: 'stamp' }],
  fix: [
    { cue: 'b1', text: "HERE'S|MONTH END", bg: K.dark, fx: 'rise' },
    { cue: 'b2', text: 'THE NEXUS|WAY.', bg: K.blue, fx: 'slam', shape: 'ring', accent: { 0: { color: '#fff' }, 1: { color: K.cyan } } }],
  snap: [
    { cue: 'b1', text: 'SNAP.', bg: K.white, fx: 'slam', size: 240, top: 200, shot: <Shot src="img/app/receipt-read.png" aspect={0.745} fx={0.35} fy={0.66} zoom={1.5} /> },
    { cue: 'b2', text: 'READ|FOR YOU.', bg: K.dark, fx: 'rise', size: 170, shot: <Shot src="img/app/receipt-read.png" aspect={0.745} fx={0.68} fy={0.6} zoom={1.55} mark={[0.524, 0.478, 0.265, 0.043]} markColor={K.blue} /> }],
  bank: [
    { cue: 'b1', text: 'BANK|LINES?', bg: K.cyan, fx: 'split' },
    { cue: 'b2', text: 'MATCHED.', bg: K.dark, fx: 'slam', size: 190, accent: { 0: GREEN }, shot: <Shot src="img/app/banking.png" aspect={0.625} fx={0.8} fy={0.5} zoom={1.7} mark={[0.862, 0.305, 0.058, 0.67]} /> }],
  vat: [
    { cue: 'b1', text: 'VAT201?', bg: K.white, fx: 'slam', shape: 'ring' },
    { cue: 'b2', text: 'WORKED|OUT.', bg: K.blue, fx: 'rise', size: 170, shot: <Shot src="img/app/vat201.png" aspect={0.625} fx={0.5} fy={0.57} zoom={1.6} mark={[0.205, 0.62, 0.535, 0.04]} /> }],
  check: [
    { cue: 'b1', text: 'YOUR|BOOKS', bg: K.dark, fx: 'rise' },
    { cue: 'b2', text: 'CHECK|THEMSELVES.', bg: K.green, fx: 'slam', size: 150, top: 300, shot: <Checks items={['Debits = credits', 'Receivables match', 'Stock matches']} /> }],
  end: [
    { cue: 'b1', text: 'MONTH|END.', bg: K.dark, fx: 'rise' },
    { cue: 'b2', text: 'DONE.', bg: K.green, fx: 'stamp', size: 300, shape: 'burst' },
    { cue: 'b3', bg: '#000', shot: <LogoBeat />, fx: 'zoom' },
    { cue: 'b4', text: 'TRY IT|FREE', bg: K.blue, fx: 'rise', top: 560, shot: <Cta /> }],
};

const make = (id: 'chase' | 'sorted', beats: Record<string, Beat[]>): React.FC => () => {
  const v = (TL as unknown as Record<string, Video>)[id]; const { fps } = useVideoConfig();
  return (<AbsoluteFill style={{ background: K.dark }}><style>{fontFace}</style>
    {v.scenes.map((s, i) => <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={Math.round(s.dur * fps)}><KScene s={s as Scene} beats={beats[s.id]} seed={i} /></Sequence>)}
    <Audio src={staticFile(`audio/${id}.wav`)} />
  </AbsoluteFill>);
};
export const Chase = make('chase', CHASE);
export const Sorted = make('sorted', SORTED);
