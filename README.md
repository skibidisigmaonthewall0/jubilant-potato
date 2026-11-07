# jubilant-potato

Tooling for making **vertical cartoon shorts**: an audio-in, finished-MP4-out pipeline built on three.js in
headless Chromium (no GPU, no Remotion).

## What is here

```
skills/cartoon-audio-short/     the skill: SKILL.md (how to run a short end to end) + kit/
  kit/engine/                    renderer: painted toon world, character cards, ink pass, lens blur, grade
  kit/example/soldier/           the worked example "The Soldier Who Never Left"
  kit/tools/                     setup.sh, doctor.sh, timing.py, render.mjs, sheet.py, audio stems, mix.py, finish.sh
  kit/vendor/                    three.js r160 + the toon.ts Pen library (both MIT), so setup works offline
tools/install.sh                one-time toolchain install (Chromium, ffmpeg, Playwright)
tools/new-short.sh              scaffold a new short project in ~/shorts/<slug>
samples/                        a finished 19.4 s short rendered by this pipeline
```

## Install once

```bash
bash tools/install.sh            # Chromium + ffmpeg + Playwright into ~/.local/opt/cartoon-kit
bash tools/new-short.sh my-short # new project in ~/shorts/my-short
```

`tools/new-short.sh` prints the six steps, and `bash doctor.sh` inside a project tells you what is missing.
Every project is used after `. ./env.sh`, which puts the local Chromium and ffmpeg on `PATH`.

## The pipeline, in short

1. `python3 timing.py voice.mp3 script.txt --out work` — word/phrase timings (whisper if present, else a
   silence-alignment DP against the script).
2. rewrite `web/story.js` — shots, cameras, lights, actors, effects as pure functions of the frame.
3. `node render.mjs stills/a "5,40,90"` + `python3 sheet.py` — look check before the long render.
4. `RESUME=1 node render.mjs frames "0-N"` — 1080x1920 JPEG frames at ~4-6 s/frame on CPU.
5. `python3 audio.py` (music + SFX stems) then `python3 mix.py voice.mp3 music.wav sfx.wav` — the bed sits at
   exactly −6 dB / 50 % of the voice, SFX capped, one soft limiter.
6. `bash finish.sh "Title"` — linear loudness to −14 LUFS, H.264 CRF 17 + AAC, QA sheet.

See `skills/cartoon-audio-short/SKILL.md` for the full rules (story, script formula, shot design, look
traps, audio levels) and `skills/cartoon-audio-short/kit/README.md` for the code layout.

## Verified sample

`samples/the-soldier-who-never-left.mp4` — 19.4 s, 1080x1920, 30 fps, H.264 CRF 17 + AAC, −14.1 LUFS,
music bed at −6.0 dB vs the voice, no frozen or black spans. Same run: 582 frames at 4.5 s/frame on CPU.
Its voice track is a synthetic stand-in narrator (only so timing and mixing could be measured without a real
recording); everything else — shots, cameras, cards, music, SFX — is the real pipeline.
