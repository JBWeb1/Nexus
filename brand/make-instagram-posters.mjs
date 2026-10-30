// Four Instagram posters (1080 x 1350) for Nexus, rendered from HTML with Chromium.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2], OUT = process.argv[3];
const b64 = (f, t = 'image/png') => `data:${t};base64,` + fs.readFileSync(path.join(ROOT, f)).toString('base64');
const LOGO = b64('brand/social/logo/nexus-logo-transparent-cropped.png');
const APP = (n) => b64(`video/public/img/app/${n}.png`);
const FONT = b64('video/public/fonts/manrope.woff2', 'font/woff2');
const W = 1080, H = 1350;

const ICON = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  shield: '<path d="M12 2.8l8 3v6.2c0 5-3.4 8.4-8 9.6-4.6-1.2-8-4.6-8-9.6V5.8z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  bell: '<path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>',
};
const ic = (n, size = 32, color = 'currentColor', sw = 2.4) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

const base = (body, bg) => `<!doctype html><html><head><style>
@font-face{font-family:Manrope;src:url(${FONT}) format("woff2");font-weight:200 800}
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:Manrope,sans-serif;position:relative;background:${bg}}
.abs{position:absolute}.h{font-weight:800;letter-spacing:-.045em;line-height:1.0}
.grad{background:linear-gradient(90deg,#60a5fa,#22d3ee 55%,#34d399);-webkit-background-clip:text;background-clip:text;color:transparent}
.blue{background:linear-gradient(90deg,#2563eb,#0ea5e9);-webkit-background-clip:text;background-clip:text;color:transparent}
.pill{display:inline-flex;align-items:center;gap:12px;padding:12px 24px;border-radius:999px;font-weight:800;font-size:24px;letter-spacing:.08em}
.chip{display:flex;align-items:center;gap:14px;padding:18px 26px;border-radius:22px;font-weight:800;font-size:30px}
.cta{display:inline-flex;align-items:center;gap:14px;padding:24px 40px;border-radius:999px;font-weight:800;font-size:34px}
.card{background:#fff;border-radius:24px;box-shadow:0 30px 60px -18px rgba(0,0,0,.45);display:flex;align-items:center;gap:18px;padding:20px 28px;font-weight:800;font-size:28px;color:#0f172a}
.dot{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;flex:none}
</style></head><body>${body}</body></html>`;

const darkBg = (glowX = 70, glowY = 30) => `<div class="abs" style="inset:0;background:radial-gradient(ellipse 900px 700px at ${glowX}% ${glowY}%,rgba(37,99,235,.45),transparent 70%),radial-gradient(ellipse 700px 600px at 10% 95%,rgba(16,185,129,.18),transparent 70%),#050a17"></div>
<div class="abs" style="inset:0;background-image:linear-gradient(rgba(125,170,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(125,170,255,.06) 1px,transparent 1px);background-size:60px 60px;-webkit-mask-image:radial-gradient(ellipse at ${glowX}% ${glowY}%,#000 10%,transparent 70%)"></div>`;
const darkFooter = (cta = 'Try it free for 14 days') => `<div class="abs" style="left:70px;right:70px;bottom:60px;display:flex;align-items:center;justify-content:space-between">
  <img src="${LOGO}" style="height:96px">
  <div class="cta" style="background:#fff;color:#1d4ed8">${cta} ${ic('arrow', 34, '#1d4ed8', 2.8)}</div></div>`;
const tile = (s) => `<div style="width:${s}px;height:${s}px;border-radius:${s * 0.24}px;background:linear-gradient(160deg,#0b1730,#060d1d);display:grid;place-items:center;box-shadow:0 14px 30px -10px rgba(15,23,42,.5)"><img src="${LOGO}" style="width:${s * 0.8}px"></div>`;

const POSTERS = {
  // 1. Getting paid
  'nexus-ig-1-get-paid.png': base(`${darkBg(80, 55)}
  <div class="abs" style="left:70px;top:80px"><div class="pill" style="background:rgba(96,165,250,.15);color:#93c5fd">${ic('bell', 26, '#93c5fd')}GET PAID FASTER</div></div>
  <div class="abs h" style="left:70px;top:170px;font-size:104px;color:#fff;width:900px">Still chasing<br>clients to<br><span class="grad">pay you?</span></div>
  <div class="abs" style="left:72px;top:520px;width:470px;font-size:32px;font-weight:600;line-height:1.4;color:#b6c6e6">Nexus sends the reminders by email or WhatsApp. Clients pay online.</div>
  <div class="abs" style="left:72px;top:760px;display:flex;flex-direction:column;gap:18px">
    ${['Before it’s due', 'On the due date', '7 and 30 days late'].map((t) => `<div class="chip" style="background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.12)">${ic('check', 30, '#34d399', 3)}${t}</div>`).join('')}</div>
  <div class="abs" style="left:610px;top:500px;width:380px;height:780px;border-radius:60px;padding:14px;background:#0f172a;box-shadow:0 0 0 3px rgba(255,255,255,.15),0 60px 120px -20px rgba(0,0,0,.7);transform:rotate(6deg)">
    <div style="width:100%;height:100%;border-radius:47px;overflow:hidden;background:#f5f7fb"><img src="${APP('portal-phone')}" style="width:100%"></div></div>
  <div class="abs card" style="left:450px;top:1020px;transform:rotate(-3deg)"><div class="dot" style="background:#dcfce7">${ic('check', 32, '#059669', 3)}</div>Paid · R 3,450.00</div>
  ${darkFooter()}`, '#050a17'),

  // 2. Month end
  'nexus-ig-2-month-end.png': base(`<div class="abs" style="inset:0;background:radial-gradient(ellipse 800px 600px at 15% 0%,rgba(59,130,246,.22),transparent 70%),radial-gradient(ellipse 800px 700px at 100% 100%,rgba(16,185,129,.16),transparent 70%),linear-gradient(180deg,#f8fbff,#eaf0fb)"></div>
  <div class="abs" style="inset:0;background-image:radial-gradient(rgba(15,23,42,.08) 1.6px,transparent 1.8px);background-size:34px 34px"></div>
  <div class="abs" style="left:0;right:0;top:80px;text-align:center"><div class="pill" style="background:rgba(37,99,235,.1);color:#2563eb">MONTH END</div></div>
  <div class="abs h" style="left:0;right:0;top:160px;text-align:center;font-size:132px;color:#0f172a">Month end,<br><span class="blue">sorted.</span></div>
  <div class="abs" style="left:60px;right:60px;top:470px;display:flex;flex-wrap:wrap;justify-content:center;gap:14px">
    ${['Receipts read from a photo', 'Bank lines matched', 'VAT201 worked out', 'Reports to Excel'].map((t) => `<div class="chip" style="background:#fff;color:#0f172a;font-size:27px;padding:14px 22px;box-shadow:0 14px 30px -14px rgba(15,23,42,.3)">${ic('check', 28, '#059669', 3)}${t}</div>`).join('')}</div>
  <div class="abs" style="left:90px;top:700px;width:900px;perspective:2000px">
    <div style="border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 60px 110px -30px rgba(15,23,42,.45);transform:rotateX(14deg) rotateY(-10deg) rotate(1deg)">
      <div style="height:40px;display:flex;align-items:center;gap:8px;padding:0 16px;border-bottom:1px solid rgba(15,23,42,.08)"><span style="width:12px;height:12px;border-radius:50%;background:#f87171"></span><span style="width:12px;height:12px;border-radius:50%;background:#fbbf24"></span><span style="width:12px;height:12px;border-radius:50%;background:#34d399"></span></div>
      <div style="height:400px;overflow:hidden;position:relative"><img src="${APP('vat201')}" style="position:absolute;width:1700px;left:-330px;top:-420px">
        <div style="position:absolute;left:12px;right:280px;top:236px;height:46px;border:4px solid #059669;border-radius:12px;box-shadow:0 0 24px rgba(5,150,105,.5)"></div></div></div></div>
  <div class="abs" style="left:70px;right:70px;bottom:60px;display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:20px">${tile(100)}<div><div style="font-weight:800;font-size:40px;color:#0f172a;letter-spacing:-.02em">Nexus Ledger</div><div style="font-weight:600;font-size:24px;color:#475569">Built for South Africa</div></div></div>
    <div class="cta" style="background:linear-gradient(90deg,#2563eb,#0ea5e9);color:#fff;font-size:30px;padding:22px 34px">Try it free ${ic('arrow', 30, '#fff', 2.8)}</div></div>`, '#f4f7fd'),

  // 3. Trust
  'nexus-ig-3-books-check-themselves.png': base(`${darkBg(50, 22)}
  <div class="abs" style="left:0;right:0;top:90px;display:flex;justify-content:center"><div style="width:220px;height:220px;border-radius:60px;display:grid;place-items:center;background:rgba(16,185,129,.12);box-shadow:0 0 120px rgba(16,185,129,.45)">${ic('shield', 140, '#34d399', 1.8)}</div></div>
  <div class="abs h" style="left:0;right:0;top:360px;text-align:center;font-size:110px;color:#fff">Books that check<br><span class="grad">themselves.</span></div>
  <div class="abs" style="left:110px;right:110px;top:640px;display:flex;flex-direction:column;gap:18px">
    ${['Debits equal credits', 'Customers owe what invoices say', 'Stock matches the stock account', 'Every document is posted'].map((t) => `<div class="chip" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#fff"><div style="width:48px;height:48px;border-radius:50%;background:#10b981;display:grid;place-items:center;flex:none">${ic('check', 30, '#052e16', 3.4)}</div>${t}</div>`).join('')}</div>
  <div class="abs" style="left:0;right:0;top:1080px;display:flex;justify-content:center;gap:12px;align-items:center;font-size:27px;font-weight:700;color:#9fb5dc">${ic('lock', 28, '#9fb5dc')}Posted entries are locked. Every change is logged.</div>
  ${darkFooter()}`, '#050a17'),

  // 4. The offer
  'nexus-ig-4-r250-everything-included.png': base(`<div class="abs" style="inset:0;background:radial-gradient(ellipse 900px 700px at 80% 10%,rgba(34,211,238,.45),transparent 70%),linear-gradient(160deg,#1d4ed8,#1e3a8a 70%,#0b1736)"></div>
  <div class="abs" style="inset:0;background-image:repeating-linear-gradient(-30deg,rgba(255,255,255,.04) 0 40px,transparent 40px 80px)"></div>
  <div class="abs" style="left:70px;top:80px"><img src="${LOGO}" style="height:110px"></div>
  <div class="abs h" style="left:62px;top:240px;font-size:300px;color:#fff;letter-spacing:-.06em">R250</div>
  <div class="abs" style="left:74px;top:530px;font-size:40px;font-weight:700;color:#cfe0ff">a month · per company</div>
  <div class="abs h" style="left:72px;top:610px;font-size:82px;color:#fff">Everything <span style="color:#67e8f9">included.</span></div>
  <div class="abs" style="left:70px;right:70px;top:740px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
    ${['Invoices & quotes', 'VAT201', 'Bank matching', 'Stock & orders', 'Projects & time', 'Receipts from photos', 'Customer portal', 'Reports to Excel'].map((t) => `<div class="chip" style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);color:#fff;font-size:28px;padding:16px 22px">${ic('check', 28, '#67e8f9', 3)}${t}</div>`).join('')}</div>
  <div class="abs" style="left:70px;right:70px;bottom:70px;display:flex;align-items:center;justify-content:space-between">
    <div class="cta" style="background:#fff;color:#1d4ed8;font-size:36px">14 days free ${ic('arrow', 36, '#1d4ed8', 2.8)}</div>
    <div style="display:flex;align-items:center;gap:12px;font-size:28px;font-weight:700;color:#dbe7ff">${ic('card', 34, '#dbe7ff')}No card needed</div></div>`, '#1d4ed8'),
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const p = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
fs.mkdirSync(OUT, { recursive: true });
for (const [file, html] of Object.entries(POSTERS)) {
  await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(OUT, file) }); console.log(file);
}
await browser.close();
