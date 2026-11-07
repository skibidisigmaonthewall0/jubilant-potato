# The Ship That Sailed With Nobody Aboard (Mary Celeste)

Working project for the `cartoon-audio-short` skill. Built into `~/shorts/mary-celeste` with
`bash tools/new-short.sh mary-celeste` + the tracked files here.

## Source
- Narration: the user's uploaded ElevenLabs take, "Spuds Oxley - Grandpa" — used dry, as supplied.
  It lives at the repo root as `ElevenLabs_2026-11-07T11_22_04_Spuds Oxley - Grandpa _pvc_sp112_s32_sb58_se50_b_m2.mp3`;
  copy it to the project as `voice.mp3`.
- Script (`script.txt`, 79 words, 4 sentences): 32.55 s of speech, 976 frames at 30 fps.

## Pipeline
```bash
bash tools/new-short.sh mary-celeste          # → ~/shorts/mary-celeste
cp <the mp3> ~/shorts/mary-celeste/voice.mp3
cd ~/shorts/mary-celeste && . ./env.sh
cp -r <this dir>/web/. web/                   # the sets + story keyframes
python3 timing.py voice.mp3 script.txt --out work
node render.mjs stills/a "30,120,300,470,620,760,940"   # spot stills
RESUME=1 node render.mjs frames "0-975"       # ~4.5 s/frame
python3 audio.py && python3 mix.py voice.mp3 music.wav sfx.wav
bash finish.sh "The Ship That Sailed With Nobody Aboard"
```

## Shot plan (frame ranges, 30 fps)
| shot | frames | what |
|---|---|---|
| wide | 0–96 | she is alone on open water, dawn |
| alongside | 97–168 | Dei Gratia hove to, her boat pulling across |
| wheel | 169–240 | the wheel swinging with nobody at it, then a creep along the empty deck |
| cabin | 241–300 | the logbook still open, the chair shoved back, lamp burning |
| gone | 301–404 | wide two-shot: two hulls, no one on either deck |
| harbour | 405–460 | golden hour, the ship standing out under full sail |
| harbour_close | 461–520 | the captain, his wife and their little girl at the rail |
| hold | 521–592 | barrels, untouched cargo; lantern swinging |
| davits | 593–730 | the empty davits, the falls still hanging, cut ends frayed |
| boat | 731–902 | the one open boat, alone on a huge sea, pulling away |
| lost | 903–975 | empty sea; the boat gone over the horizon |

## Accuracy notes
Only documented facts: left New York 7 Nov 1872, found 4 Dec 1872 by *Dei Gratia*, ten people
aboard including the captain's wife and daughter, cargo, food and water intact, the lifeboat,
chronometer and sextant gone, never found. No "half-eaten dinner", no undamaged boats invented.

## Finished render
`out/The-Ship-That-Sailed-With-Nobody-Aboard.mp4` — 1080x1920, 30 fps, 32.5 s, H.264 CRF 17,
AAC 192k. Audio -14.6 LUFS integrated, -1.2 dBTP, LRA 2.6 LU. `contact-sheet.jpg` is the QA grid
(one frame every half second).

`finish.sh` here is the two-pass version: a single `loudnorm` pass lands ~1 dB short because it
normalises dynamically, so it measures first and then applies one linear gain.

## The end card
The last beat ("nobody has ever found them") is open water at dusk and one oar floating where the
boat was last seen — no text card, no invented detail.
