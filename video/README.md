# Nexus Ledger short videos

Seven 9:16 shorts (1080×1920, 30 fps, about 30 seconds each), made with [Remotion](https://www.remotion.dev):

| id | Hook | Story |
|---|---|---|
| `proof` | "Somewhere in your books, a hundred rand doesn't add up. Would you even know?" | Books health checks itself and points to the problem |
| `secure` | "Could someone quietly change last month's invoice?" | Locked entries, company separation, passwords and 2FA, activity log, data export |
| `price` | "Two hundred and fifty rand. That's the whole price." | No add-ons, everything included, 14-day trial, leave any time |
| `paid` | "Still chasing clients for money? Again?" | Automatic reminders on a schedule, email with the PDF or WhatsApp, customer pays from the portal link |
| `receipts` | "Month end. A shoebox full of slips. Sound familiar?" | Photo of a slip is read into a bill (supplier, date, total, VAT), VAT ready for the VAT201 |
| `switch` | "Want to leave Xero, but dreading the move?" | Export who owes you and who you owe as a spreadsheet; Nexus finds the columns, creates customers and suppliers; add the opening bank balance and the books check out |
| `accountant` | "What does your accountant charge to fix messy books?" | Accountant's own login and view (work queue, bank matching, month end), all checks passed, trial balance and general ledger to Excel |

## How it fits together

- `src/scripts.json`: the narration for each scene, plus **cues**, phrases in the line that a visual beat (and a sound effect) lands on.
- `public/audio/vo/<video>--<scene>.wav`: the recorded narration (Kokoro TTS, voice `af_heart`).
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
