"""Builds everything the Remotion videos play to, from src/scripts.json and the narration in public/audio/vo/:

  src/timeline.json            when each scene starts, the exact second of every visual beat (cue), and caption words
  public/audio/<video>.wav     the soundtrack: narration on cue, music ducked under the voice, sound effects on the beats

Cue times come from where a phrase sits in its line of narration, and the same numbers drive the picture and the sound
effects, so they stay in sync. Run: python tools/build.py   (needs numpy, scipy and soundfile)"""
import json, os
import numpy as np, soundfile as sf
from scipy.signal import resample_poly, lfilter, butter

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SR = 44100; FPS = 30
HOOK_LEAD, LEAD, TAIL, END_HOLD = 0.15, 0.35, 0.95, 2.4
# Spoken words written as people read them, for the captions.
WRITTEN = [('Two hundred and fifty rand', 'R250'), ('a hundred rand', 'R100'), ('fourteen days', '14 days'), ('VAT two-oh-one', 'VAT201'), ('seven hundred and ninety thousand', '790,000'), ('four hundred and fifty rand', 'R450'), ('twenty invoices', '20 invoices'), ('one percent', '1%'), ('twenty three million rand', 'R23 million'), ('two hundred and fifty rand', 'R250'), ('Two hundred and fifty rand', 'R250'), ('Fourteen days', '14 days'), ('fourteen-day', '14-day')]

def build_timeline(scripts):
    out = {}
    for vid, v in scripts.items():
        t, scenes = 0.0, []
        for i, s in enumerate(v['scenes']):
            wav = f"{ROOT}/public/audio/vo/{vid}--{s['id']}.wav"; speech = sf.info(wav).duration
            tight = v.get('music') == 'punchy'  # kinetic videos: words land back to back
            lead = HOOK_LEAD if i == 0 else (0.1 if tight else LEAD); tail = (0.3 if tight else TAIL) + (END_HOLD if s['id'] == 'end' else 0)
            dur = lead + speech + tail; say = s['say']
            at = lambda phrase: round(t + lead + speech * say.index(phrase) / len(say), 3)
            cues = {k: at(p) for k, p in s['cues'].items()}
            # Caption words, each with the moment it is spoken (by its place in the line).
            written = say
            for a, b in WRITTEN: written = written.replace(a, b)
            words, pos = [], 0
            for w in written.split(' '):
                spoken_pos = say.find(w.strip('.,?'), pos) if w not in ('R250', 'R100', '14') else pos
                if spoken_pos < 0: spoken_pos = pos
                words.append({'w': w, 't': round(t + lead + speech * spoken_pos / len(say), 3)}); pos = max(pos, spoken_pos + 1)
            scenes.append({'id': s['id'], 'start': round(t, 3), 'dur': round(dur, 3), 'voiceAt': round(t + lead, 3), 'speech': round(speech, 3), 'cues': cues, 'words': words,
                           'sfx': [{'t': cues[c], 'type': kind} for c, kind in s.get('sfx', [])]})
            t += dur
        out[vid] = {'title': v['title'], 'fps': FPS, 'total': round(t, 3), 'frames': int(round(t * FPS)), 'scenes': scenes}
    return out

# ---------- sound effects, made from scratch ----------
rng = np.random.default_rng(11)
def env(n, a, r): e = np.ones(n); ai, ri = max(1, int(a * SR)), max(1, int(r * SR)); e[:ai] = np.linspace(0, 1, ai); e[-ri:] *= np.linspace(1, 0, ri); return e
def band(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
def sfx(kind):
    if kind == 'whoosh':
        n = int(0.45 * SR); return band(rng.standard_normal(n), 500, 5000) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.09
    if kind in ('impact', 'impact-soft'):
        n = int(0.6 * SR); tt = np.arange(n) / SR; f = 45 + 90 * np.exp(-tt * 25)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7) + band(rng.standard_normal(n), 200, 3000) * np.exp(-tt * 40) * 0.5
        return x * (0.5 if kind == 'impact' else 0.3)
    if kind == 'tick':
        n = int(0.09 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * 1760 * tt) * np.exp(-tt * 60) * 0.18
    if kind == 'ding':
        n = int(0.9 * SR); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * 1047 * tt) + 0.6 * np.sin(2 * np.pi * 1568 * tt) * (tt > 0.09)) * np.exp(-tt * 5) * 0.13
    if kind == 'pop':
        n = int(0.12 * SR); tt = np.arange(n) / SR; f = 300 + 900 * np.exp(-tt * 40); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 30) * 0.22
    if kind == 'glitch':
        n = int(0.5 * SR); x = rng.standard_normal(n); x = np.repeat(x[::40], 40)[:n]; gate = (np.floor(np.arange(n) / (SR * 0.035)) % 2); return band(x, 300, 6000) * gate * np.exp(-np.arange(n) / SR * 4) * 0.12
    if kind == 'typing':
        out = np.zeros(int(0.8 * SR))
        for k in range(7):
            i = int((k * 0.1 + rng.random() * 0.03) * SR); n = int(0.03 * SR); out[i:i + n] += band(rng.standard_normal(n), 2000, 8000) * np.exp(-np.arange(n) / SR * 160) * 0.12
        return out
    if kind == 'strike':
        n = int(0.3 * SR); return band(rng.standard_normal(n), 1500, 7000) * np.linspace(0, 1, n) ** 0.5 * np.exp(-np.arange(n) / SR * 9) * 0.1
    raise ValueError(kind)

def music(total, beat_at, seed):
    """Warm, steady bed: pads, plucked marimba, and a soft four-on-the-floor once the hook is over."""
    r = np.random.default_rng(seed); N = int((total + 0.5) * SR); L = np.zeros(N); R_ = np.zeros(N); BEAT = 60 / 104; BAR = 4 * BEAT
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    CH = [[46, 53, 58, 60, 62], [43, 50, 55, 57, 58], [39, 46, 51, 53, 55], [41, 48, 53, 55, 57]]; chord = lambda t: CH[int(t // (2 * BAR)) % 4]
    def add(x, t, pan=0.0, g=1.0):
        i = int(t * SR)
        if i >= N: return
        j = min(N, i + len(x)); L[i:j] += x[:j - i] * g * np.cos((pan + 1) * np.pi / 4); R_[i:j] += x[:j - i] * g * np.sin((pan + 1) * np.pi / 4)
    t = 0.0
    while t < total + 0.5:
        n = int((2 * BAR + 0.8) * SR); tt = np.arange(n) / SR; x = np.zeros(n)
        for m in chord(t + 0.01):
            for det in (-0.05, 0.05):
                for k in range(1, 6): x += np.sin(2 * np.pi * hz(m + det) * k * tt + r.random() * 6) * (0.6 / k) * np.exp(-k * 0.45)
        x *= env(n, 0.6, 0.8) * 0.012; add(x, t, -0.2); add(x * 0.9, t + 0.012, 0.25); t += 2 * BAR
    t, i = 0.0, 0; pat = [0, 2, 1, 3, 2, 4, 3, 2]
    while t < total:
        m = chord(t)[1:][pat[i % 8] % 4] + 12; n = int(0.55 * SR); tt = np.arange(n) / SR
        x = (np.sin(2 * np.pi * hz(m) * tt) * np.exp(-tt * 8) + 0.3 * np.sin(2 * np.pi * hz(m) * 4 * tt) * np.exp(-tt * 26)) * env(n, 0.003, 0.05)
        add(x, t, 0.35 if i % 2 else -0.35, 0.06 if t >= beat_at else 0.04); t += BEAT / 2; i += 1
    t = beat_at
    while t < total - 2.5:
        n = int(0.35 * SR); tt = np.arange(n) / SR; f = 48 + 75 * np.exp(-tt * 30); add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 10), t, 0, 0.22)
        h = int(0.04 * SR); b, a = butter(2, 7000 / (SR / 2), 'high'); add(lfilter(b, a, r.standard_normal(h)) * np.exp(-np.arange(h) / SR * 80), t + BEAT / 2, 0.3, 0.035)
        root = chord(t)[0] - 12; n = int(BEAT * 0.5 * SR); tt = np.arange(n) / SR
        add((np.sin(2 * np.pi * hz(root) * tt) + 0.25 * np.sin(4 * np.pi * hz(root) * tt)) * env(n, 0.005, 0.08), t + BEAT * 0.5, 0, 0.12); t += BEAT
    mix = np.stack([L, R_], 1); mix /= np.max(np.abs(mix)) * 1.1
    fi = int(0.6 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]; fo = int(2.5 * SR); end = N - int(0.5 * SR); mix[end - fo:end] *= np.linspace(1, 0, fo)[:, None]; mix[end:] = 0
    return mix

def music_punchy(total, seed):
    """Driving 120 BPM bed for the kinetic videos: kick on every beat, claps on 2 and 4, off-beat hats, bass, pumping chords."""
    r = np.random.default_rng(seed); N = int((total + 0.5) * SR); L = np.zeros(N); R_ = np.zeros(N); BEAT = 0.5
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    ROOTS = [45, 41, 48, 43]; CH = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]  # Am F C G
    def add(x, t, pan=0.0, g=1.0):
        i = int(t * SR)
        if i >= N: return
        j = min(N, i + len(x)); L[i:j] += x[:j - i] * g * np.cos((pan + 1) * np.pi / 4); R_[i:j] += x[:j - i] * g * np.sin((pan + 1) * np.pi / 4)
    hp = butter(2, 8000 / (SR / 2), 'high'); bp = butter(2, [900 / (SR / 2), 4000 / (SR / 2)], 'band')
    n_beats = int(total / BEAT) + 1
    for b in range(n_beats):
        t = b * BEAT; bar = b // 4; root = ROOTS[bar % 4]
        n = int(0.4 * SR); tt = np.arange(n) / SR; f = 45 + 110 * np.exp(-tt * 28)
        add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9), t, 0, 0.5)  # kick
        if b % 2 == 1:
            n = int(0.25 * SR); add(lfilter(*bp, r.standard_normal(n)) * np.exp(-np.arange(n) / SR * 18), t, 0.1, 0.22)  # clap
        n = int(0.05 * SR); add(lfilter(*hp, r.standard_normal(n)) * np.exp(-np.arange(n) / SR * 90), t + BEAT / 2, 0.3, 0.08)  # hat
        n = int(BEAT * 0.45 * SR); tt = np.arange(n) / SR; m = root - 12
        add((np.sin(2 * np.pi * hz(m) * tt) + 0.35 * np.sin(4 * np.pi * hz(m) * tt) + 0.15 * np.sin(6 * np.pi * hz(m) * tt)) * env(n, 0.004, 0.06), t + BEAT / 2, 0, 0.16)  # bass
        n = int(BEAT * SR); tt = np.arange(n) / SR; x = np.zeros(n)
        for c in CH[bar % 4]:
            for det in (-0.06, 0.06): x += np.sin(2 * np.pi * hz(c + det) * tt + r.random() * 6) + 0.3 * np.sin(4 * np.pi * hz(c + det) * tt)
        pump = 1 - 0.85 * np.exp(-tt * 9); add(x * pump * env(n, 0.01, 0.05) * 0.018, t, -0.25); add(x * pump * env(n, 0.01, 0.05) * 0.016, t + 0.01, 0.25)
    mix = np.stack([L, R_], 1); mix /= np.max(np.abs(mix)) * 1.1
    fo = int(1.5 * SR); end = N - int(0.5 * SR); mix[end - fo:end] *= np.linspace(1, 0, fo)[:, None]; mix[end:] = 0
    return mix

def soundtrack(vid, tl, seed, style='calm'):
    N = int((tl['total'] + 0.3) * SR); voice = np.zeros(N); fx = np.zeros(N)
    for s in tl['scenes']:
        v, vsr = sf.read(f"{ROOT}/public/audio/vo/{vid}--{s['id']}.wav"); v = v.mean(1) if v.ndim > 1 else v
        v = resample_poly(v, SR, vsr) if vsr != SR else v; v = v / (np.sqrt(np.mean(v ** 2)) + 1e-9) * 0.09
        i = int(s['voiceAt'] * SR); voice[i:i + len(v)] += v[:N - i]
        for e in s['sfx']:
            x = sfx(e['type']); i = int(e['t'] * SR); fx[i:i + len(x)] += x[:N - i]
        if s is not tl['scenes'][0]:  # a soft whoosh into every scene
            x = sfx('whoosh') * 0.6; i = int(max(0, s['start'] - 0.2) * SR); fx[i:i + len(x)] += x[:N - i]
    pk = np.abs(voice); o = pk > 0.32; voice[o] = np.sign(voice[o]) * (0.32 + (pk[o] - 0.32) * 0.4)
    lvl = np.convolve(np.abs(voice), np.ones(1323) / 1323, mode='same'); sp = (lvl > 0.004).astype(float)
    a = np.exp(-1 / (0.25 * SR)); g = np.clip(lfilter([1 - a], [1, -a], sp) * 1.6, 0, 1)  # follows the voice, eases back in
    m = (music_punchy(tl['total'], seed) if style == 'punchy' else music(tl['total'], tl['scenes'][1]['start'], seed))[:N]; m = np.pad(m, ((0, N - len(m)), (0, 0)))
    out = m * (1 - 0.6 * g)[:, None] * 0.6 + np.stack([voice + fx] * 2, 1)
    out /= max(1.0, np.max(np.abs(out)) / 0.95)
    sf.write(f"{ROOT}/public/audio/{vid}.wav", out.astype(np.float32), SR)

if __name__ == '__main__':
    scripts = json.load(open(f'{ROOT}/src/scripts.json'))
    tl = build_timeline(scripts)
    json.dump(tl, open(f'{ROOT}/src/timeline.json', 'w'), indent=1)
    for k, vid in enumerate(tl): soundtrack(vid, tl[vid], 40 + k, scripts[vid].get('music', 'calm')); print(vid, tl[vid]['total'], 's,', tl[vid]['frames'], 'frames')
