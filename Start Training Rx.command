#!/bin/bash
# ──────────────────────────────────────────────────────────────
# Double-click this file to run Training Rx locally in your browser.
# (This helper is only for testing on your Mac — it is NOT part of
#  the hosted website and can be ignored/deleted anytime.)
# ──────────────────────────────────────────────────────────────
cd "$(dirname "$0")"
PORT=4577
URL="http://localhost:$PORT"

echo "────────────────────────────────────────────"
echo "   TRAINING RX — local preview"
echo ""
echo "   Opening: $URL"
echo "   Keep this window OPEN while using the app."
echo "   To stop: close this window (or press Ctrl-C)."
echo "────────────────────────────────────────────"

# free the port in case a previous run is still holding it
lsof -ti tcp:"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null

# open the browser a second after the server starts
( sleep 1 && open "$URL" ) &

# start a simple static web server (ruby ships with macOS; python3 as backup)
if command -v ruby >/dev/null 2>&1; then
  ruby -run -e httpd . -p "$PORT"
elif command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
else
  echo ""
  echo "Couldn't find ruby or python3 to run the preview."
  echo "Press any key to close."
  read -n 1
fi
