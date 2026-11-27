# Nexus Ledger ad (19.5 s, 4K, 16:9 and 9:16)

A product ad built as code: the real app screens float in 3D (`gl3d.js`, WebGL), one camera per scene, and every
scene hands over to the next through a shape that grows to fill the frame. All beat times are in the `B` block at the
top of `nexus.html`, so re-timing is a one-line change and the sound follows it.

Open `nexus.html` in Chrome to watch it loop (`?t=8.5` for one frame, `?ar=9x16` for the vertical version).

## Render

```bash
export CHROME=/path/to/chrome   # Chrome or Chromium
node render.mjs stills nexus.html out/stills 1 5 9 13 17 --gpu              # check frames
node render.mjs video nexus.html "out/Nexus Ledger ad - 4K.mp4" --fps 25 --scale 2 --gpu --audio "out/Nexus ad - sound.wav"
PAGE_QS="&ar=9x16" node render.mjs video nexus.html "out/Nexus Ledger ad - vertical 4K.mp4" --fps 25 --scale 2 --gpu --audio "out/Nexus ad - sound.wav"
```

## Sound

```bash
node render.mjs events nexus.html out/events.json --gpu    # beat times from the page
python3 synth_sfx.py sounds/                                # free sound-effects kit
python3 mix.py cues.json "out/Nexus ad - sound.wav" --lib sounds --lib music_dl --events out/events.json --len 19.5 --gain 7
```

The music is an ElevenLabs Music track (take 1 of 4, in `music_dl/take1.wav`, not committed). Commercial use of
ElevenLabs music depends on your ElevenLabs plan.
