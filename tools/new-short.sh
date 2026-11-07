#!/usr/bin/env bash
# New short project from the installed skill:  bash tools/new-short.sh <slug>
# Creates ~/shorts/<slug>, copies the engine + tools, links Playwright, writes env.sh.
set -e
SLUG="${1:?usage: bash tools/new-short.sh <slug>}"
KIT="$(cd "$(dirname "$0")/../skills/cartoon-audio-short/kit" && pwd)"
P="$HOME/shorts/$SLUG"
bash "$KIT/tools/setup.sh" "$P"
cd "$P" && . ./env.sh && bash doctor.sh || true
cat <<EOF

project: $P
  1. put your voiceover there as voice.mp3 (and the script as script.txt)
  2. . ./env.sh && python3 timing.py voice.mp3 script.txt --out work
  3. rewrite web/story.js for the story, preview stills:  node render.mjs stills/a "5,40,90"
  4. render:  RESUME=1 node render.mjs frames "0-N"
  5. sound:   python3 audio.py && python3 mix.py voice.mp3 music.wav sfx.wav
  6. finish:  bash finish.sh "Title Of Short"   -> out/Title-Of-Short.mp4
EOF
