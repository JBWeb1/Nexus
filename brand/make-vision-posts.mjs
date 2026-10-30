// Three "picture it" Instagram posts (1080 x 1350): night sky to sunrise, glowing words, glass cards.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2], OUT = process.argv[3];
const b64 = (f, t = 'image/png') => `data:${t};base64,` + fs.readFileSync(path.join(ROOT, f)).toString('base64');
const LOGO = b64('brand/social/logo/nexus-logo-transparent-cropped.png');
const FONT = b64('video/public/fonts/manrope.woff2', 'font/woff2');
const W = 1080, H = 1350;

// Deterministic starfield.
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const stars = (n, warm = false) => Array.from({ length: n }, () => { const s = 2 + rnd() * 5, o = 0.3 + rnd() * 0.7;
  return `<div style="position:absolute;left:${rnd() * W}px;top:${rnd() * H}px;width:${s}px;height:${s}px;border-radius:50%;background:${warm ? '#fde68a' : '#c7d2fe'};opacity:${o};box-shadow:0 0 ${s * 3}px ${warm ? '#fbbf24' : '#93c5fd'}"></div>`; }).join('');

const SV = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', spark: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>',
};
const ic = (n, s = 32, c = 'currentColor', w = 2.4) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${SV[n]}</svg>`;

const page = (body) => `<!doctype html><html><head><style>
@font-face{font-family:Manrope;src:url(${FONT}) format("woff2");font-weight:200 800}
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:Manrope,sans-serif;position:relative;color:#fff;background:#060a24}
.a{position:absolute}.h{font-weight:800;letter-spacing:-.045em;line-height:1.02;text-shadow:0 0 50px rgba(125,180,255,.55)}
.g{background:linear-gradient(90deg,#93c5fd,#67e8f9 50%,#6ee7b7);-webkit-background-clip:text;background-clip:text;color:transparent}
.gw{background:linear-gradient(90deg,#fde68a,#fbbf24 50%,#fb923c);-webkit-background-clip:text;background-clip:text;color:transparent}
.glass{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.2);border-radius:30px;box-shadow:0 30px 80px -20px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.18)}
.lbl{display:inline-flex;align-items:center;gap:10px;padding:12px 24px;border-radius:999px;font-weight:800;font-size:24px;letter-spacing:.14em;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2)}
.foot{left:70px;right:70px;bottom:62px;display:flex;align-items:center;justify-content:space-between}
.cta{display:inline-flex;align-items:center;gap:14px;padding:22px 38px;border-radius:999px;font-weight:800;font-size:32px;color:#fff;background:linear-gradient(90deg,#2563eb,#06b6d4);box-shadow:0 0 50px rgba(59,130,246,.6)}
</style></head><body>${body}</body></html>`;
const night = `<div class="a" style="inset:0;background:linear-gradient(180deg,#060a24 0%,#0d1240 50%,#1c0f45 100%)"></div>
<div class="a" style="width:1300px;height:1300px;left:-300px;top:500px;background:radial-gradient(closest-side,rgba(96,165,250,.3),transparent)"></div>
<div class="a" style="width:1000px;height:1000px;left:400px;top:-350px;background:radial-gradient(closest-side,rgba(167,139,250,.28),transparent)"></div>`;
const foot = (cta = 'Start free') => `<div class="a foot"><img src="${LOGO}" style="height:88px;filter:drop-shadow(0 0 20px rgba(59,130,246,.6))"><div class="cta">${cta} ${ic('arrow', 32, '#fff', 2.8)}</div></div>`;
const ring = (x, y, r, color, w = 3) => `<div class="a" style="left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;border:${w}px solid ${color}"></div>`;

const POSTS = {
  'nexus-vision-1-picture-it.png': page(`${night}${stars(90)}
    <div class="a" style="left:0;right:0;top:80px;text-align:center"><div class="lbl">${ic('spark', 26, '#c7d2fe')}CLOSE YOUR EYES</div></div>
    <div class="a h" style="left:0;right:0;top:170px;text-align:center;font-size:150px">Picture <span class="g">it.</span></div>
    <div class="a" style="left:90px;right:90px;top:360px;text-align:center;font-size:40px;font-weight:600;line-height:1.35;color:#d4dcff">Every invoice, <b style="color:#fff">paid on time.</b><br>No chasing. No awkward messages.</div>
    ${ring(540, 900, 330, 'rgba(147,197,253,.35)', 2)}${ring(540, 900, 260, 'rgba(110,231,183,.25)', 2)}
    ${[['INV-0041', 'R 3,105.00', -6, 600], ['INV-0042', 'R 9,936.00', 3, 790], ['INV-0043', 'R 15,525.00', -2, 980]].map(([n, a, r, y], i) => `
    <div class="a glass" style="left:${170 + i * 30}px;top:${y}px;width:680px;padding:30px 36px;display:flex;align-items:center;gap:24px;transform:rotate(${r}deg)">
      ${ic('file', 52, '#93c5fd', 2)}<div style="flex:1"><div style="font-size:34px;font-weight:800">${n}</div><div style="font-size:28px;font-weight:600;color:#c7d2fe">${a}</div></div>
      <div style="display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:14px;border:4px solid #34d399;color:#34d399;font-size:28px;font-weight:800;transform:rotate(-6deg);box-shadow:0 0 30px rgba(52,211,153,.5)">${ic('check', 28, '#34d399', 3.4)}PAID</div></div>`).join('')}
    ${foot()}`),

  'nexus-vision-2-weekend-yours.png': page(`<div class="a" style="inset:0;background:linear-gradient(180deg,#1e1b4b 0%,#6d28d9 38%,#db2777 62%,#f97316 84%,#fbbf24 100%)"></div>
    <div class="a" style="width:1400px;height:900px;left:-160px;top:760px;background:radial-gradient(closest-side,rgba(253,230,138,.55),transparent)"></div>${stars(45, true)}
    <div class="a" style="left:0;right:0;top:80px;text-align:center"><div class="lbl">${ic('sun', 26, '#fde68a')}MONTH END</div></div>
    <div class="a h" style="left:0;right:0;top:170px;text-align:center;font-size:128px">Done by <span class="gw" style="text-shadow:none">3.</span></div>
    <div class="a h" style="left:0;right:0;top:330px;text-align:center;font-size:104px">Weekend? <span style="color:#fde68a">Yours.</span></div>
    <svg class="a" style="left:0;top:0" width="${W}" height="${H}"><path d="M150 1010 A390 390 0 0 1 930 1010" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4" stroke-dasharray="10 14"/><line x1="110" y1="1010" x2="970" y2="1010" stroke="rgba(255,255,255,.5)" stroke-width="3"/></svg>
    <div class="a" style="left:${540 + Math.cos(Math.PI * 0.62) * 390 - 80}px;top:${1010 - Math.sin(Math.PI * 0.62) * 390 - 80}px;width:160px;height:160px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#fef3c7,#f59e0b);box-shadow:0 0 120px #fbbf24,0 0 40px #fde68a">${ic('sun', 80, '#7c2d12', 2)}</div>
    <div class="a glass" style="left:0;right:0;margin:auto;top:1050px;width:520px;padding:20px 30px;text-align:center;font-size:40px;font-weight:800">15:00 · books done ${ic('check', 36, '#34d399', 3.2)}</div>
    <div class="a" style="left:0;right:0;top:470px;display:flex;justify-content:center;gap:16px">
      ${['Saturday', 'Sunday'].map((d) => `<div class="glass" style="padding:16px 30px;font-size:34px;font-weight:800;border-radius:999px">${d} · free</div>`).join('')}</div>
    ${foot('Try it free')}`),

  'nexus-vision-3-one-decision.png': page(`<div class="a" style="inset:0;background:radial-gradient(ellipse 900px 900px at 50% 46%,#13205a 0%,#060a24 60%,#02030c 100%)"></div>${stars(110)}
    ${ring(540, 610, 380, 'rgba(147,197,253,.22)', 2)}${ring(540, 610, 300, 'rgba(147,197,253,.35)', 3)}${ring(540, 610, 220, 'rgba(110,231,183,.45)', 3)}
    <div class="a" style="width:1100px;height:1100px;left:-10px;top:60px;background:radial-gradient(closest-side,rgba(37,99,235,.55),transparent)"></div>
    <div class="a" style="left:0;right:0;top:420px;display:flex;justify-content:center"><img src="${LOGO}" style="width:560px;filter:drop-shadow(0 0 50px rgba(59,130,246,.9))"></div>
    <div class="a h" style="left:0;right:0;top:110px;text-align:center;font-size:58px;color:#c7d2fe;font-weight:700">Your best year</div>
    <div class="a h" style="left:0;right:0;top:880px;text-align:center;font-size:84px">starts with</div>
    <div class="a h" style="left:0;right:0;top:975px;text-align:center;font-size:124px"><span class="g">one decision.</span></div>
    <div class="a" style="left:0;right:0;top:1150px;text-align:center;font-size:30px;font-weight:600;color:#c7d2fe">Nexus Ledger · accounting built for South Africa</div>
    <div class="a" style="left:0;right:0;bottom:56px;display:flex;justify-content:center"><div class="cta" style="font-size:34px">Start your 14-day free trial ${ic('arrow', 34, '#fff', 2.8)}</div></div>`),
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const p = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
fs.mkdirSync(OUT, { recursive: true });
for (const [file, html] of Object.entries(POSTS)) { await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(OUT, file) }); console.log(file); }
await browser.close();
