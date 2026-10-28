# Nexus Ledger short videos

Twelve videos: seven 9:16 shorts (1080×1920, 30 fps, about 30 seconds each), a 9:16 lead video, and a 16:9 investor pitch (1920×1080), made with [Remotion](https://www.remotion.dev):

| id | Hook | Story |
|---|---|---|
| `proof` | "Somewhere in your books, a hundred rand doesn't add up. Would you even know?" | Books health checks itself and points to the problem |
| `secure` | "Could someone quietly change last month's invoice?" | Locked entries, company separation, passwords and 2FA, activity log, data export |
| `price` | "Two hundred and fifty rand. That's the whole price." | No add-ons, everything included, 14-day trial, leave any time |
| `paid` | "Still chasing clients for money? Again?" | Automatic reminders on a schedule, email with the PDF or WhatsApp, customer pays from the portal link |
| `receipts` | "Month end. A shoebox full of slips. Sound familiar?" | Photo of a slip is read into a bill (supplier, date, total, VAT), VAT ready for the VAT201 |
| `switch` | "Want to leave Xero, but dreading the move?" | Export who owes you and who you owe as a spreadsheet; Nexus finds the columns, creates customers and suppliers; add the opening bank balance and the books check out |
| `accountant` | "What does your accountant charge to fix messy books?" | Accountant's own login and view (work queue, bank matching, month end), all checks passed, trial balance and general ledger to Excel |
| `pitch` (16:9, 75 s) | "South Africa has about 790,000 formal small businesses…" | Market, Xero pricing, product, trust, R250 model and accounting-firm channel, the 1% arithmetic, status, the ask. Sources in PITCH-SOURCES.md |
| `promo` (16:9, 78 s) | "This is Nexus Ledger…" | Product promo, one feature per scene: invoicing, getting paid, receipts, banking, VAT201, stock/orders/projects, books health, security, accountant access and Excel export. No competitor comparison |
| `howpaid` (16:9, 47 s, light) | "Here's how getting paid works…" | Explainer clicking through real app screens: dashboard, new invoice, VAT and totals, invoice statuses, reminders, customer portal |
| `howpaid-tiktok`, `monthend-tiktok` (9:16) | same | TikTok versions of the two explainers: headline on top, a taller app window with a closer camera, callouts below |
| `monthend` (16:9, 55 s, light) | "It's month end…" | Explainer on real screens: receipts, bank matching, work queue, VAT201, reports to Excel, insights |
| `leads` (41 s) | "Three quick questions…" | VAT201, late payers chased, R250 all included, 14 days free |

## How it fits together

- `src/scripts.json`: the narration for each scene, plus **cues**, phrases in the line that a visual beat (and a sound effect) lands on.
- `public/audio/vo/<video>--<scene>.wav`: the recorded narration (Kokoro TTS, voice `af_heart`).
- Narration: `af_heart` for the shorts, the male voice `am_michael` for `pitch`, `leads` and `promo`.
- `src/explainer.tsx`: light explainer pieces for `howpaid` and `monthend`: a browser window that tilts in 3D and zooms like a camera onto real screenshots (`public/img/app/`), a cursor that clicks, highlight boxes and callout cards. Positions inside a screenshot are fractions of its width and height.
- `src/mg.tsx`: motion-graphics pieces (masked word reveals, line drawing, panel wipes) used by `pitch`, `leads` and `promo`.
- `tools/build.py` reads both and writes:
  - `src/timeline.json`: scene start times, the second each cue is spoken, and caption word timings
  - `public/audio/<video>.wav`: the soundtrack (narration, music ducked under the voice, and synthesized sound effects on the cues)
- `src/Proof.tsx`, `src/Secure.tsx`, `src/Price.tsx`, `src/Paid.tsx`, `src/Receipts.tsx`, `src/Switch.tsx` and `src/Accountant.tsx` animate each scene against those cue times. Shared pieces (background, captions, phone frame, shake/glitch, scene transitions) live in `src/lib.tsx`.

The picture and the sound effects are both driven by the same cue times, so they stay in sync when the narration changes.

## Commands

```bash
npm install
python tools/build.py          # after changing scripts.json or the narration (needs numpy, scipy, soundfile)
npm run studio                 # preview and scrub in the browser
npm run render                 # writes out/<id>.mp4 for every video (or: node tools/render-all.mjs paid receipts)
CHROME=/path/to/chrome npm run render   # if Remotion can't download its own browser
```

## Licence note

Remotion is free for individuals and companies of up to 3 people. Larger companies need a Remotion company licence: see https://www.remotion.dev/license.
