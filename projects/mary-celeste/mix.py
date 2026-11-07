#!/usr/bin/env python3
"""Level-locked mix:  python3 mix.py voice.mp3 music.wav sfx.wav [--out mix_raw.wav]

The music bed and the SFX sit at 50 % of the voice level (gated RMS, i.e. exactly -6.0 dB).
SFX peaks are additionally capped at 0.7x the voice peak so no hit pokes out over the narration.
One linear gain, then a soft peak limiter on the summed mix only. No ducking, no compression.
Prints the measured levels so you can confirm: music -6.0 dB, sfx at or below that.
"""
import sys, subprocess, wave
import numpy as np

SR = 48000
GATE_DB = -45.0          # samples quieter than this are ignored when measuring the voice
TARGET = 0.5             # 50 % of the voice level == -6.02 dB
SFX_PEAK_CAP = 0.7       # max sfx peak, relative to the voice peak
LIMIT = 0.89             # soft limiter ceiling before normalising back down


def read(path, sr=SR):
    """Decode any audio file to mono float32 at sr."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def gated_rms(x):
    if not len(x):
        return 0.0
    thr = 10 ** (GATE_DB / 20)
    # frame gate: 20 ms frames, keep frames whose rms is above the gate
    n = int(0.02 * SR)
    k = len(x) // n
    if k < 1:
        return float(np.sqrt(np.mean(x ** 2)))
    fr = x[: k * n].reshape(k, n)
    env = np.sqrt(np.mean(fr ** 2, axis=1))
    keep = env > thr
    if not keep.any():
        keep = env > env.max() * 0.05
    return float(np.sqrt(np.mean(fr[keep] ** 2)))


def db(x):
    return 20 * np.log10(max(x, 1e-9))


def fit(x, n):
    """Zero-pad / trim a stem to exactly n samples."""
    out = np.zeros(n, np.float32)
    m = min(n, len(x))
    out[:m] = x[:m]
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = {sys.argv[i]: sys.argv[i + 1] for i, a in enumerate(sys.argv) if a.startswith("--") and i + 1 < len(sys.argv)}
    if len(args) < 3:
        print("usage: python3 mix.py voice.mp3 music.wav sfx.wav [--out mix_raw.wav]"); sys.exit(2)
    vpath, mpath, spath = args[:3]
    out = opts.get("--out", "mix_raw.wav")

    voice = read(vpath)
    music = read(mpath)
    sfx = read(spath)
    n = len(voice)
    music, sfx = fit(music, n), fit(sfx, n)

    v_rms = gated_rms(voice)
    v_peak = float(np.max(np.abs(voice))) or 1.0
    if v_rms <= 0:
        print("voice is silent; nothing to lock to"); sys.exit(1)

    # 1) music bed -> 50 % of the voice's gated RMS
    m_rms = gated_rms(music) or 1e-9
    music *= (v_rms * TARGET) / m_rms

    # 2) sfx -> 50 %, then capped so peaks stay under 0.7x the voice peak
    s_rms = gated_rms(sfx) or 1e-9
    sfx *= (v_rms * TARGET) / s_rms
    s_peak = float(np.max(np.abs(sfx)))
    cap = v_peak * SFX_PEAK_CAP
    if s_peak > cap:
        sfx *= cap / s_peak

    mix = voice + music + sfx

    # 3) only one linear gain + a soft peak limiter on the sum
    peak = float(np.max(np.abs(mix)))
    if peak > LIMIT:
        mix = np.tanh(mix / LIMIT * 1.2) / np.tanh(1.2) * LIMIT
        mix *= peak / max(float(np.max(np.abs(mix))), 1e-9)  # keep the loudness we had
    fade = int(0.04 * SR)
    if len(mix) > fade:
        mix[-fade:] *= np.linspace(1, 0, fade)

    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    with wave.open(out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

    # report
    tgt_db = db(TARGET)
    print(f"voice   rms {db(v_rms):6.1f} dBFS   peak {db(v_peak):6.1f} dBFS   {n / SR:.2f} s")
    print(f"music   {db(gated_rms(music)) - db(v_rms):+6.1f} dB vs voice  (target {tgt_db:+.1f})")
    print(f"sfx     {db(gated_rms(sfx)) - db(v_rms):+6.1f} dB vs voice  peak {db(float(np.max(np.abs(sfx)))) - db(v_peak):+.1f} dB vs voice peak (cap {db(SFX_PEAK_CAP):+.1f})")
    print(f"mix     peak {db(float(np.max(np.abs(mix)))):.1f} dBFS -> {out}")


if __name__ == "__main__":
    main()
