"""Synthesized music bed + SFX stems for "The Ship That Sailed With Nobody Aboard".

Writes music.wav and sfx.wav only; mix.py applies the level lock
(music/sfx at 50 % of the voice, i.e. -6 dB). Cue times come from work/phrases.json
so every hit lands on a word of the narration.
"""
import json, wave
import numpy as np

SR = 48000
TOTAL_FRAMES = 976
DUR = TOTAL_FRAMES / 30.0          # 32.533 s
N = int(DUR * SR)
rng = np.random.default_rng(11)
F = lambda f: f / 30.0            # frame -> seconds


# ---------------------------------------------------------------- helpers
def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)


def lp_fast(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x)).astype(np.float32)


def hp_fast(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x)).astype(np.float32)


def place(buf, sig, t0, gain=1.0):
    i = int(t0 * SR); j = min(len(buf), i + len(sig))
    if i < len(buf) and j > i:
        buf[i:j] += sig[: j - i] * gain


midi = lambda m: 440 * 2 ** ((m - 69) / 12)
noise = lambda d: rng.standard_normal(int(d * SR)).astype(np.float32)


def swell(d, lo=180, hi=1600, a=0.5, r=0.6):
    """wind / sea wash: band-limited noise with a slow swell"""
    n = int(d * SR); t = np.arange(n) / SR
    s = hp_fast(lp_fast(noise(d), hi), lo)
    e = np.minimum(1, t / a) * np.minimum(1, (d - t) / max(r, 1e-3))
    return (s * np.clip(e, 0, 1)).astype(np.float32)


# ---------------------------------------------------------------- music
# A slow sea lament in D minor: a held drone, a rocking fifth, and a music box.
music = np.zeros(N, np.float32)
BEAT = 60 / 62.0                   # very slow
LOAD = 26.6                        # the bed lets go as the last line starts
t_all = np.arange(N) / SR

# 1. drone: D2/A2/D3, breathing
drone = (np.sin(2 * np.pi * 73.42 * t_all)
         + 0.6 * np.sin(2 * np.pi * 110.0 * t_all + 0.4)
         + 0.35 * np.sin(2 * np.pi * 146.83 * t_all + 1.1)
         + 0.18 * np.sin(2 * np.pi * 220.0 * t_all + 2.0))
breath = 0.62 + 0.38 * np.sin(2 * np.pi * 0.085 * t_all - 1.2) ** 2
drone = lp_fast((drone * breath).astype(np.float32), 900)
fade_in = np.clip(t_all / 2.2, 0, 1)
fade_out = np.clip((DUR - t_all) / 3.4, 0, 1) ** 1.4
music += drone * 0.32 * fade_in * fade_out

# 2. the rocking boat: a slow two-note cell, low and wooden
def pluck(f, dur=0.9, bright=0.42):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum((bright ** k) * np.sin(2 * np.pi * f * (k + 1) * t) / (k + 1) ** 1.6 for k in range(5))
    return (s * env(n, 0.01, dur * 0.3)).astype(np.float32)

CELL = [50, 57, 53, 48]            # D3 A3 F3 C3 — a rocking figure
tt = 0.6; k = 0
while tt < LOAD:
    m = CELL[k % 4]
    place(music, pluck(midi(m), 1.2, 0.36), tt, 0.16)
    place(music, pluck(midi(m + 12), 0.7, 0.5), tt + BEAT * 0.5, 0.055)
    tt += BEAT; k += 1

# 3. music box: a sparse, high, slightly out-of-tune melody over the middle
BOX = [(0, 74), (2, 77), (3.5, 81), (5, 79), (7, 77), (8.5, 74), (10, 72), (12, 74)]
for b, m in BOX:
    t0 = F(300) + b * BEAT
    if t0 < LOAD:
        place(music, pluck(midi(m), 1.6, 0.62), t0, 0.075)
        place(music, pluck(midi(m + 12), 0.9, 0.75), t0 + 0.012, 0.02)

# 4. the last line: the bed thins to a single sustained fifth, then a low swell
dn = int((DUR - LOAD) * SR); td = np.arange(dn) / SR
tail = (np.sin(2 * np.pi * 73.42 * td) + 0.5 * np.sin(2 * np.pi * 110.0 * td)) * np.minimum(1, td / 1.5) * np.exp(-td / 6.0)
place(music, lp_fast(tail.astype(np.float32), 700), LOAD, 0.22)

# ---------------------------------------------------------------- sfx
sfx = np.zeros(N, np.float32)


def creak(d=0.7, f0=130):
    n = int(d * SR); t = np.arange(n) / SR
    rate = f0 * (1 + 0.4 * np.sin(2 * np.pi * 1.1 * t / d))
    ph = np.cumsum(rate) / SR
    pulses = (np.mod(ph, 1) < 0.07).astype(np.float32)
    s = lp_fast(pulses * (0.6 + 0.4 * rng.random(n).astype(np.float32)), 2400) * np.sin(np.pi * t / d)
    return (hp_fast(s, 180) * 2.6).astype(np.float32)


def thunk(f0=78, d=0.45):
    n = int(d * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * f0 * t * (1 + 0.5 * np.exp(-t * 30))) * np.exp(-t * 11)
    knock = lp_fast(noise(d), 1100) * np.exp(-t * 26) * 0.45
    return (body + knock).astype(np.float32)


def splash(d=1.1, big=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    s = (hp_fast(lp_fast(noise(d), 5200), 700) * np.exp(-t * 3.4) * np.minimum(1, t / 0.012)
         + lp_fast(noise(d), 380) * np.exp(-t * 6) * 1.3 * big)
    return s.astype(np.float32)


def slap(d=0.5):
    """wave against a hull"""
    n = int(d * SR); t = np.arange(n) / SR
    s = lp_fast(noise(d), 900) * np.exp(-t * 7) * np.minimum(1, t / 0.05)
    return (s * 1.4).astype(np.float32)


def rope(d=0.42, f0=190):
    n = int(d * SR); t = np.arange(n) / SR
    scrape = hp_fast(lp_fast(noise(d), 6000), 1800) * np.exp(-t * 5) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t))
    ping = np.sin(2 * np.pi * f0 * t) * np.exp(-t * 22) * 0.4
    return (scrape * 0.5 + ping).astype(np.float32)


def gull(d=0.6):
    n = int(d * SR); t = np.arange(n) / SR
    f = 900 + 500 * np.sin(np.pi * t / d) ** 2
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    return (s * np.sin(np.pi * t / d) ** 2 * 0.35).astype(np.float32)


def bell(d=2.0, f=1046.5):
    n = int(d * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t * k)
            for r, k in [(1.0, 1.6), (2.0, 2.4), (2.98, 3.2), (4.2, 4.4)])
    return (s * np.minimum(1, t / 0.006) * 0.28).astype(np.float32)


def sting(d=2.4):
    n = int(d * SR); t = np.arange(n) / SR
    low = np.sin(2 * np.pi * 36.7 * t) * np.exp(-t * 1.1)
    wash = lp_fast(noise(d), 800) * np.exp(-t * 4) * 0.7
    return (low * 1.1 + wash).astype(np.float32)


# --- cue sheet (times from work/phrases.json + the shot plan) --------------
# The whole SFX stem sits well under the -6 dB ceiling on purpose: these are sea sounds
# under a spoken line, not hits. mix.py still applies the level lock afterwards.
# 0.06-1.62 "In 1872, sailors boarded a ship..."  — sea, wind, a distant gull
place(sfx, swell(3.4, 140, 1500, 0.9, 1.2), 0.02, 0.5)
place(sfx, gull(0.62), 0.55, 0.30)
place(sfx, gull(0.5), 0.78, 0.18)
place(sfx, slap(0.6), 1.10, 0.5)
# 2.18 "The ship was in perfect order."  — the hull groans, water slaps
place(sfx, creak(0.85, 118), 2.30, 0.55)
place(sfx, slap(0.55), 3.30, 0.45)
# 3.96 "The crew was gone."  — the wind takes over, empty
place(sfx, swell(2.6, 220, 2400, 1.0, 1.4), 3.98, 0.55)
place(sfx, creak(0.55, 165), 4.65, 0.5)
# 5.88 "The Mary Celeste had left New York..." — harbour (from 405 later); here the boat pulling
place(sfx, rope(0.4, 175), 6.00, 0.5)
place(sfx, splash(0.85), 6.55, 0.42)
# 8.42-10.60 "...with ten people aboard, including the captain's wife and their little girl"
place(sfx, bell(2.2, 880), 8.55, 0.30)
place(sfx, gull(0.55), 9.90, 0.22)
# 10.60 "the captain's wife and their little girl" — a music-box turn, very quiet
place(sfx, bell(1.6, 1318.5), 10.75, 0.16)
# 13.90-16.82 "The cargo was untouched. The food and water were untouched."
place(sfx, thunk(64, 0.5), 14.05, 0.55)
place(sfx, creak(0.7, 96), 15.10, 0.42)
place(sfx, splash(0.9), 16.10, 0.45)
# 17.26 "Only the lifeboat was missing." — the davits, the falls
place(sfx, rope(0.5, 210), 17.30, 0.55)
place(sfx, creak(0.9, 140), 18.20, 0.6)
place(sfx, rope(0.45, 180), 19.30, 0.5)
# 19.76-24.04 "So ten people climbed into a tiny open boat and left a working ship behind."
place(sfx, splash(1.3, 1.2), 19.85, 0.55)
place(sfx, creak(0.8, 104), 21.20, 0.55)
place(sfx, swell(3.0, 160, 1800, 1.2, 1.6), 22.10, 0.42)
# 24.76 "Nobody has ever found them." — the sting, then only open water
place(sfx, sting(2.6), 24.80, 0.62)
place(sfx, splash(1.5, 0.8), 26.40, 0.4)
place(sfx, swell(6.0, 120, 1200, 2.0, 2.6), 27.00, 0.40)
place(sfx, slap(0.7), 30.20, 0.35)


# ---------------------------------------------------------------- stems
def write_wav(path, x):
    x = np.clip(x, -1, 1)
    pcm = (x * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


sfx *= 0.42        # sea sounds under narration: quieter than the level ceiling allows
music *= 1.0

write_wav("music.wav", music)
write_wav("sfx.wav", sfx)
print(f"stems ok: music.wav sfx.wav  {N / SR:.2f} s  ({TOTAL_FRAMES} frames)")
print("now: python3 mix.py voice.mp3 music.wav sfx.wav")
