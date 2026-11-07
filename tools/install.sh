#!/usr/bin/env bash
# One-time toolchain install for the cartoon-audio-short skill.
# Needs network to registry.npmjs.org and github.com only. Safe to re-run.
#   bash install.sh            # installs into ~/.local/opt/cartoon-kit and /usr/local/bin
set -e
TOOL="${TOOL:-$HOME/.local/opt/cartoon-kit}"
mkdir -p "$TOOL/bin" "$TOOL/lib"
say() { printf "\033[36m%s\033[0m\n" "$*"; }

# ---- python bits -----------------------------------------------------------
say "python: numpy + Pillow"
python3 - <<'EOF' 2>/dev/null || pip3 install --break-system-packages -q numpy pillow
import numpy, PIL
EOF

# ---- ffmpeg / ffprobe (static, libx264 + aac) ------------------------------
if [ ! -x "$TOOL/bin/ffmpeg" ]; then
  say "ffmpeg: fetching a static build from github.com/zackees/ffmpeg_bins (git, not HTTP)"
  rm -rf /tmp/_ffb && git clone -q --depth 1 --filter=blob:none --sparse https://github.com/zackees/ffmpeg_bins /tmp/_ffb \
    && cd /tmp/_ffb && git sparse-checkout disable >/dev/null 2>&1; git checkout -q v5.0/linux.zip \
    && unzip -oq v5.0/linux.zip -d /tmp/_ff5 && cp /tmp/_ff5/linux/ffmpeg /tmp/_ff5/linux/ffprobe "$TOOL/bin/"
fi
chmod +x "$TOOL/bin/"* 2>/dev/null || true
for b in ffmpeg ffprobe; do
  if [ -w /usr/local/bin ]; then ln -sf "$TOOL/bin/$b" "/usr/local/bin/$b"; fi
done

# ---- Chromium (headless, swiftshader WebGL) --------------------------------
if [ ! -x "$TOOL/chromium" ]; then
  say "chromium: unpacking @sparticuz/chromium (no browser download needed)"
  mkdir -p /tmp/_chr && cd /tmp/_chr && npm init -y >/dev/null 2>&1
  npm install --no-audit --no-fund @sparticuz/chromium >/dev/null
  node -e "require('@sparticuz/chromium').default.executablePath().then(p=>process.stdout.write(p))" > /tmp/_chr_path
  cp "$(cat /tmp/_chr_path)" "$TOOL/chromium" && chmod +x "$TOOL/chromium"
  # its ANGLE/swiftshader libs land in /tmp next to the binary
  cp /tmp/libEGL.so /tmp/libGLESv2.so /tmp/libvk_swiftshader.so /tmp/libvulkan.so.1 /tmp/vk_swiftshader_icd.json "$TOOL/" 2>/dev/null || true
  # NSS/NSPR runtime libs from the packaged AL2023 bundle
  node -e "const fs=require('fs'),z=require('zlib');fs.writeFileSync('/tmp/_al2023.tar',z.brotliDecompressSync(fs.readFileSync('/tmp/_chr/node_modules/@sparticuz/chromium/bin/al2023.tar.br')))"
  mkdir -p /tmp/_al && tar xf /tmp/_al2023.tar -C /tmp/_al && cp /tmp/_al/lib/* "$TOOL/lib/"
fi

# ---- Playwright (no browsers of its own; uses CHROME_BIN) ------------------
if [ ! -d "$TOOL/node_modules/playwright" ]; then
  say "playwright 1.65 (browser download skipped)"
  cd "$TOOL" && npm init -y >/dev/null 2>&1
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund playwright@1.65.0 >/dev/null
fi

# ---- check ----------------------------------------------------------------
chmod +x "$(dirname "$0")"/tools/*.sh 2>/dev/null || true
LD_LIBRARY_PATH="$TOOL/lib:$TOOL" "$TOOL/chromium" --version
"$TOOL/bin/ffmpeg" -hide_banner -version | head -1
say "toolchain ready in $TOOL"
say "new project:  bash tools/new-short.sh my-short    then:  cd ~/shorts/my-short && . ./env.sh && bash doctor.sh"
