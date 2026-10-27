# Nexus Ledger short videos

Three 9:16 shorts (1080×1920, 30 fps, about 30 seconds each), made with [Remotion](https://www.remotion.dev):

| id | Hook | Story |
|---|---|---|
| `proof` | "Somewhere in your books, a hundred rand doesn't add up. Would you even know?" | Books health checks itself and points to the problem |
| `secure` | "Could someone quietly change last month's invoice?" | Locked entries, company separation, passwords and 2FA, activity log, data export |
| `price` | "Two hundred and fifty rand. That's the whole price." | No add-ons, everything included, 14-day trial, leave any time |

## How it fits together

- `src/scripts.json`: the narration for each scene, plus **cues**, phrases in the line that a visual beat (and a sound effect) lands on.
- `public/audio/vo/<video>--<scene>.wav`: the recorded narration (Kokoro TTS, voice `af_heart`).
- `tools/build.py` reads both and writes:
  - `src/timeline.json`: scene start times, the second each cue is spoken, and caption word timings
  - `public/audio/<video>.wav`: the soundtrack (narration, music ducked under the voice, and synthesized sound effects on the cues)
- `src/Proof.tsx`, `src/Secure.tsx` and `src/Price.tsx` animate each scene against those cue times. Shared pieces (background, captions, phone frame, shake/glitch, scene transitions) live in `src/lib.tsx`.

The picture and the sound effects are both driven by the same cue times, so they stay in sync when the narration changes.

## Commands

```bash
npm install
python tools/build.py          # after changing scripts.json or the narration (needs numpy, scipy, soundfile)
npm run studio                 # preview and scrub in the browser
npm run render                 # writes out/proof.mp4, out/secure.mp4, out/price.mp4
CHROME=/path/to/chrome npm run render   # if Remotion can't download its own browser
```

## Licence note

Remotion is free for individuals and companies of up to 3 people. Larger companies need a Remotion company licence: see https://www.remotion.dev/license.
