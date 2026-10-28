// Renders the Nexus social media pack from the transparent logo, one HTML page per size, with Chromium.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2], OUT = process.argv[3];
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(SRC, f)).toString('base64');
const FULL = b64('logo-full.png'), N = b64('logo-n.png');
const FONT = 'data:font/woff2;base64,' + fs.readFileSync(path.join(SRC, 'manrope.woff2')).toString('base64');
const TAG = 'Accounting software built for South Africa';
const TAG2 = 'Accounting software<br>built for South Africa';
const SUB = 'Invoices · VAT201 · Banking · Reports';

const page = (w, h, body, glow = [50, 50]) => `<!doctype html><html><head><style>
@font-face{font-family:Manrope;src:url(${FONT}) format("woff2");font-weight:200 800}
*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{background:#000;font-family:Manrope,sans-serif;color:#fff;position:relative}
.bg{position:absolute;inset:0;background:
 radial-gradient(ellipse ${Math.max(w, h) * 0.55}px ${Math.max(w, h) * 0.4}px at ${glow[0]}% ${glow[1]}%, rgba(29,78,216,.42), rgba(29,78,216,0) 70%),
 radial-gradient(ellipse ${w * 0.5}px ${h * 0.6}px at ${100 - glow[0] * 0.4}% 100%, rgba(14,165,233,.16), rgba(14,165,233,0) 70%), #000}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(125,170,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(125,170,255,.06) 1px,transparent 1px);background-size:${Math.round(Math.min(w, h) / 9)}px ${Math.round(Math.min(w, h) / 9)}px;-webkit-mask-image:radial-gradient(ellipse at ${glow[0]}% ${glow[1]}%,#000 10%,transparent 70%)}
.c{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.tag{font-weight:800;letter-spacing:-.02em;line-height:1.1}
.sub{font-weight:600;color:#9fc0ff;letter-spacing:.01em;margin-top:.5em}
.pill{display:inline-block;margin-top:1.1em;padding:.5em 1.1em;border-radius:999px;border:2px solid rgba(125,170,255,.45);color:#cfe0ff;font-weight:700}
</style></head><body><div class="bg"></div><div class="grid"></div>${body}</body></html>`;

// Square profile picture: the full logo sits inside the circle most platforms crop to.
const profile = (s) => page(s, s, `<div class="c"><img src="${FULL}" style="width:${s * 0.8}px"></div>`, [50, 42]);
// Tiny icons: just the N, which stays readable at 16 px.
const icon = (s, round = false) => page(s, s, `<style>.grid{display:none}</style><div class="c" style="${round ? `border-radius:${s * 0.22}px;overflow:hidden` : ''}"><img src="${N}" style="width:${s * 0.9}px;margin-top:${s * 0.04}px"></div>`, [50, 45]);
// Banner: logo then text, centred on (cx%, cy%) of the canvas so platform overlays don't cover it.
const banner = (w, h, { logoH, tag, sub = 0, cx = 50, cy = 50, gap = 0.05, sub2 = true }) => page(w, h, `
  <div style="position:absolute;left:${cx}%;top:${cy}%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:${w * gap}px;white-space:nowrap">
    <img src="${FULL}" style="height:${logoH}px">
    <div><div class="tag" style="font-size:${tag}px">${TAG.replace(' built', '<br>built')}</div>${sub2 && sub ? `<div class="sub" style="font-size:${sub}px">${SUB}</div>` : ''}</div>
  </div>`, [cx - 12, cy]);
// Portrait / square posts and stories: logo above, text below.
const stack = (w, h, { logoW, tag, sub, top = 50, pill }) => page(w, h, `
  <div style="position:absolute;left:0;right:0;top:${top}%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 ${w * 0.08}px">
    <img src="${FULL}" style="width:${logoW}px">
    <div class="tag" style="font-size:${tag}px;margin-top:${tag * 0.9}px">${TAG2}</div>
    <div class="sub" style="font-size:${sub}px">${SUB}</div>${pill ? `<div class="pill" style="font-size:${sub}px">${pill}</div>` : ''}
  </div>`, [50, top - 8]);

const JOBS = [
  // profile pictures
  ['profile/instagram-profile-1080.png', 1080, 1080, profile(1080)],
  ['profile/facebook-profile-720.png', 720, 720, profile(720)],
  ['profile/linkedin-profile-400.png', 400, 400, profile(400)],
  ['profile/linkedin-company-logo-300.png', 300, 300, profile(300)],
  ['profile/x-twitter-profile-400.png', 400, 400, profile(400)],
  ['profile/tiktok-profile-720.png', 720, 720, profile(720)],
  ['profile/youtube-profile-800.png', 800, 800, profile(800)],
  ['profile/whatsapp-business-640.png', 640, 640, profile(640)],
  ['profile/google-business-720.png', 720, 720, profile(720)],
  ['profile/pinterest-profile-600.png', 600, 600, profile(600)],
  // covers and banners
  ['covers/facebook-cover-1640x624.png', 1640, 624, banner(1640, 624, { logoH: 300, tag: 58, sub: 28 })],
  ['covers/x-twitter-header-1500x500.png', 1500, 500, banner(1500, 500, { logoH: 240, tag: 50, sub: 24, cx: 56, cy: 44 })],
  ['covers/linkedin-banner-1584x396.png', 1584, 396, banner(1584, 396, { logoH: 200, tag: 44, sub: 22, cx: 62, cy: 48, gap: 0.035 })],
  ['covers/linkedin-company-cover-1128x191.png', 1128, 191, banner(1128, 191, { logoH: 120, tag: 28, sub: 0, cx: 60, gap: 0.03, sub2: false })],
  ['covers/youtube-banner-2560x1440.png', 2560, 1440, banner(2560, 1440, { logoH: 330, tag: 62, sub: 30, gap: 0.025 })],
  ['covers/facebook-event-cover-1920x1005.png', 1920, 1005, banner(1920, 1005, { logoH: 380, tag: 66, sub: 32 })],
  // posts, stories, link previews
  ['posts/square-post-1080x1080.png', 1080, 1080, stack(1080, 1080, { logoW: 620, tag: 54, sub: 30 })],
  ['posts/portrait-post-1080x1350.png', 1080, 1350, stack(1080, 1350, { logoW: 700, tag: 60, sub: 32 })],
  ['posts/story-reel-tiktok-1080x1920.png', 1080, 1920, stack(1080, 1920, { logoW: 800, tag: 66, sub: 34, top: 46, pill: 'Try it free for 14 days' })],
  ['posts/pinterest-pin-1000x1500.png', 1000, 1500, stack(1000, 1500, { logoW: 700, tag: 58, sub: 30 })],
  ['posts/link-preview-og-1200x630.png', 1200, 630, banner(1200, 630, { logoH: 300, tag: 46, sub: 22, gap: 0.04 })],
  ['posts/email-signature-600x200.png', 600, 200, banner(600, 200, { logoH: 130, tag: 20, sub: 11, gap: 0.04 })],
  // app and browser icons
  ['icons/app-icon-1024.png', 1024, 1024, icon(1024)],
  ['icons/android-chrome-512.png', 512, 512, icon(512)],
  ['icons/android-chrome-192.png', 192, 192, icon(192)],
  ['icons/apple-touch-icon-180.png', 180, 180, icon(180)],
  ['icons/favicon-48.png', 48, 48, icon(48)],
  ['icons/favicon-32.png', 32, 32, icon(32)],
  ['icons/favicon-16.png', 16, 16, icon(16)],
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const [file, w, h, html] of JOBS) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  const out = path.join(OUT, file); fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  console.log(file);
}
await browser.close();
