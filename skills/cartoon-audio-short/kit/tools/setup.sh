#!/usr/bin/env bash
# Creates a new short project:  bash tools/setup.sh <project_dir>
# Needs: node >= 22.6 (type stripping), python3 + numpy, ffmpeg, git, Chromium for Playwright.
# No network is needed when the kit's vendor/ folder is intact (three.module.js + toon.ts are vendored).
set -e
KIT="$(cd "$(dirname "$0")/.." && pwd)"; P="${1:?project dir}"
mkdir -p "$P/web/lib" "$P/work" "$P/stills" "$P/out"
cp "$KIT"/engine/*.js "$KIT"/engine/index.html "$P/web/"
cp "$KIT"/example/soldier/story.js "$P/web/story.js"        # starting point: rewrite for the new story
cp "$KIT"/example/soldier/audio.py "$P/audio.py"            # starting point: rewrite the cue table
cp "$KIT"/tools/*.mjs "$KIT"/tools/*.py "$P/" 2>/dev/null || true
cp "$KIT"/tools/finish.sh "$KIT"/tools/doctor.sh "$P/" 2>/dev/null || true
chmod +x "$P"/*.sh 2>/dev/null || true

# three.js r160 (module build): vendored first, then npm, then a sparse git clone.
if [ ! -f "$P/web/lib/three.module.js" ]; then
  if [ -f "$KIT/vendor/three.module.js" ]; then
    cp "$KIT/vendor/three.module.js" "$P/web/lib/"
  elif ! ( cd /tmp && rm -rf _three && mkdir _three && cd _three && npm pack three@0.160.0 >/dev/null 2>&1 && tar xzf three-0.160.0.tgz && cp package/build/three.module.js "$P/web/lib/" ); then
    cd /tmp && rm -rf _t3 && git clone -q --depth 1 --filter=blob:none --sparse --branch r160 https://github.com/mrdoob/three.js _t3 \
      && cd _t3 && git sparse-checkout set build && cp build/three.module.js "$P/web/lib/"
  fi
fi

# toon base: the Pen / head / face library from mromidev/claude-animated-shorts, types stripped.
[ -f "$KIT/vendor/toon.ts" ] || { mkdir -p "$KIT/vendor"; git clone -q --depth 1 https://github.com/mromidev/claude-animated-shorts /tmp/_cas && cp /tmp/_cas/templates/bridge/toon.ts "$KIT/vendor/toon.ts"; }
node -e "const m=require('node:module'),fs=require('fs');fs.writeFileSync('$P/web/toonbase.js',m.stripTypeScriptTypes(fs.readFileSync('$KIT/vendor/toon.ts','utf8'),{mode:'transform'}))" 2>/dev/null
cat "$P/web/toonbase.js" "$P/web/roman.js" > "$P/web/toon.js"

# playwright: project-local, then a global install, then the shared toolchain install.
mkdir -p "$P/node_modules"
for cand in "$KIT/../node_modules/playwright" "$(npm root -g)/playwright" "$HOME/.local/opt/cartoon-kit/node_modules/playwright"; do
  if [ ! -e "$P/node_modules/playwright" ] && [ -d "$cand" ]; then ln -sf "$cand" "$P/node_modules/playwright"; fi
done

# env.sh: one place that knows where the local Chromium / ffmpeg live.
cat > "$P/env.sh" <<'ENV'
# source this before rendering:  . ./env.sh
TOOL="$HOME/.local/opt/cartoon-kit"
[ -d "$TOOL/bin" ] && PATH="$TOOL/bin:$PATH"
[ -d "$TOOL/lib" ] && LD_LIBRARY_PATH="$TOOL/lib:$LD_LIBRARY_PATH"
[ -x "$TOOL/chromium" ] && CHROME_BIN="$TOOL/chromium"
export PATH LD_LIBRARY_PATH CHROME_BIN
ENV

echo "ready: $P"
echo "  next: . ./env.sh && python3 timing.py voice.mp3 script.txt --out work"
echo "  after editing cast code run: cat web/toonbase.js web/roman.js > web/toon.js"
