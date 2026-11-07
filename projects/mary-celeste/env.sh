TOOL="$HOME/.local/opt/cartoon-kit"
[ -d "$TOOL/bin" ] && PATH="$TOOL/bin:$PATH"
[ -d "$TOOL/lib" ] && LD_LIBRARY_PATH="$TOOL/lib:$LD_LIBRARY_PATH"
[ -x "$TOOL/chromium" ] && CHROME_BIN="$TOOL/chromium"
export PATH LD_LIBRARY_PATH CHROME_BIN
