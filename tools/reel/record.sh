#!/bin/sh
# Nagrywa pionową rolkę (1080x1920) do głównego folderu gry:
#   ./tools/reel/record.sh            -> nowa-gra-rolka.mp4 (Instagram, z „LINK W BIO”)
#   ./tools/reel/record.sh facebook   -> nowa-gra-rolka-facebook.mp4 (bez „LINK W BIO”)
# Potrzebuje Node.js i Google Chrome. Trwa około pół minuty, dźwięk nie leci z głośników.
set -e
cd "$(dirname "$0")/../.."
VARIANT="${1:-instagram}"
if [ "$VARIANT" = "facebook" ]; then OUT=nowa-gra-rolka-facebook.mp4; else OUT=nowa-gra-rolka.mp4; fi
RAW="rolka-surowa-$VARIANT.mp4"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="$(mktemp -d)"

node tools/reel/server.js "$RAW" &
SERVER=$!
"$CHROME" --headless=new --autoplay-policy=no-user-gesture-required --mute-audio \
  --window-size=1280,900 --force-device-scale-factor=2 --hide-scrollbars \
  --disable-background-timer-throttling --disable-renderer-backgrounding \
  --user-data-dir="$PROFILE" "http://127.0.0.1:8330/tools/reel/reel.html?wersja=$VARIANT" >/dev/null 2>&1 &
CHROME_PID=$!
( sleep 120; kill $SERVER 2>/dev/null ) &
WATCHDOG=$!

wait $SERVER || true
kill $CHROME_PID $WATCHDOG 2>/dev/null || true
rm -rf "$PROFILE"
if [ ! -s "$RAW" ]; then
  echo "Nagranie się nie udało."
  exit 1
fi

# Instagram i Facebook wolą zwykłe MP4 z czasem trwania w nagłówku, więc przepuszczamy nagranie przez konwerter macOS.
avconvert --source "$RAW" --output "$OUT" --preset PresetHighestQuality --replace
rm -f "$RAW"
echo "Gotowe: $OUT"
