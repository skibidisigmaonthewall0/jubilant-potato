#!/usr/bin/env bash
# Health check for the cartoon-short pipeline:  bash tools/doctor.sh [project_dir]
# Exit 0 = ready to render. Each failing line says exactly what to do.
ok() { printf "  \033[32mok\033[0m   %s\n" "$1"; }
bad() { printf "  \033[31mMISS\033[0m %s\n" "$1"; FAIL=1; }
FAIL=0
TOOL="$HOME/.local/opt/cartoon-kit"
P="${1:-.}"

echo "toolchain"
node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=6)?0:1)' \
  && ok "node $(node -v) (type stripping)" || bad "node >= 22.6 (have $(node -v 2>/dev/null || echo none))"
command -v ffmpeg >/dev/null && ffmpeg -hide_banner -version 2>/dev/null | head -1 | grep -q . \
  && ok "ffmpeg $(ffmpeg -hide_banner -version 2>/dev/null | head -1 | cut -d' ' -f3)" || bad "ffmpeg on PATH (brew/apt, or the static build in $TOOL/bin)"
command -v ffprobe >/dev/null && ok "ffprobe" || bad "ffprobe on PATH"
python3 -c "import numpy, PIL" 2>/dev/null && ok "python numpy + Pillow" || bad "pip install numpy pillow"
python3 -c "import faster_whisper" 2>/dev/null && ok "faster-whisper (word timings)" || echo "  note no whisper: timing.py will silence-align the script (fine, needs the script)"

echo "chromium"
EXE="${CHROME_BIN:-$TOOL/chromium}"
if [ -x "$EXE" ] && [ -d "$TOOL/lib" ]; then
  LD_LIBRARY_PATH="$TOOL/lib:$TOOL" "$EXE" --version >/dev/null 2>&1 \
    && ok "chromium $(LD_LIBRARY_PATH="$TOOL/lib:$TOOL" "$EXE" --version 2>/dev/null)" \
    || bad "chromium at $EXE fails to start (missing libs?)"
elif [ -x "$EXE" ]; then ok "chromium $("$EXE" --version 2>/dev/null) (system libs)"
else bad "no chromium: npx playwright install chromium, or point CHROME_BIN at one"
fi
[ -d "$P/node_modules/playwright" ] && ok "playwright linked in $P/node_modules" || bad "npm i playwright in the project (setup.sh links it when possible)"

echo "project $P"
for f in web/main.js web/story.js web/toon.js web/lib/three.module.js render.mjs mix.py sheet.py timing.py; do
  [ -f "$P/$f" ] && ok "$f" || bad "$f missing (run: bash tools/setup.sh $P)"
done
if [ -f "$P/voice.mp3" ] || [ -f "$P/voice.wav" ]; then ok "voiceover present"; else echo "  note no voice.mp3/voice.wav yet"; fi
[ -d "$P/frames" ] && echo "  note $(ls "$P/frames" 2>/dev/null | wc -l) frames rendered so far"

echo; [ $FAIL -eq 0 ] && echo "ready" || { echo "fix the MISS lines above"; exit 1; }
