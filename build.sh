#!/usr/bin/env bash
# Builds the Android APK from the web app in ./web.
# Needs: Java 17+, curl, unzip. No Android SDK required.
#
#   ./build.sh                      -> dist/bet-tracker-unsigned.apk (aligned, not signed)
#   BT_KEYSTORE=... BT_KEYSTORE_PASS=... BT_KEY_ALIAS=... ./build.sh
#                                   -> dist/bet-tracker.apk (signed with your key)
set -euo pipefail
cd "$(dirname "$0")"

APKTOOL_VER=2.10.0
APKTOOL_SHA=c0350abbab5314248dfe2ee0c907def4edd14f6faef1f5d372d3d4abd28f0431
UBER_VER=1.3.0
UBER_SHA=e1299fd6fcf4da527dd53735b56127e8ea922a321128123b9c32d619bba1d835

T=.build/tools; mkdir -p "$T" dist

fetch() { # url file sha256
  if [ ! -f "$2" ]; then echo "Downloading $(basename "$2")"; curl -fsSL -o "$2" "$1"; fi
  echo "$3  $2" | sha256sum -c --quiet - || { echo "Checksum mismatch for $2 — refusing to use it."; rm -f "$2"; exit 1; }
}
fetch "https://github.com/iBotPeaches/Apktool/releases/download/v$APKTOOL_VER/apktool_$APKTOOL_VER.jar" "$T/apktool.jar" "$APKTOOL_SHA"
fetch "https://github.com/patrickfav/uber-apk-signer/releases/download/v$UBER_VER/uber-apk-signer-$UBER_VER.jar" "$T/uber-apk-signer.jar" "$UBER_SHA"

echo "Assembling app"
rm -rf .build/app && mkdir -p .build/app/assets
cp -r android/. .build/app/
cp -r web/. .build/app/assets/
java -jar "$T/apktool.jar" b .build/app -o .build/unsigned.apk >/dev/null

echo "Aligning"
case "$(uname -s)" in
  Linux)  ZA=linux-zipalign-33_0_2; LIB="binary-lib/linux-lib64-33_0_2/libc++.so" ;;
  Darwin) ZA=mac-zipalign-33_0_2;   LIB="binary-lib/mac-lib64-33_0_2/libc++.dylib" ;;
  *) echo "Run this on Linux or macOS (or WSL)."; exit 1 ;;
esac
(cd "$T" && unzip -o -q uber-apk-signer.jar "$ZA" "$LIB" 2>/dev/null || unzip -o -q uber-apk-signer.jar "$ZA") && chmod +x "$T/$ZA"
LIBDIR="$(cd "$T/$(dirname "$LIB")" 2>/dev/null && pwd || true)"
LD_LIBRARY_PATH="$LIBDIR" DYLD_LIBRARY_PATH="$LIBDIR" "$T/$ZA" -p -f 4 .build/unsigned.apk .build/aligned.apk

if [ -n "${BT_KEYSTORE:-}" ]; then
  echo "Signing with your key"
  javac -cp "$T/uber-apk-signer.jar" -d .build tools/Sign.java
  java -cp "$T/uber-apk-signer.jar:.build" Sign .build/aligned.apk dist/bet-tracker.apk
  echo "Done: dist/bet-tracker.apk"
else
  cp .build/aligned.apk dist/bet-tracker-unsigned.apk
  echo "Done: dist/bet-tracker-unsigned.apk"
  echo "Android only installs signed APKs. Set BT_KEYSTORE, BT_KEYSTORE_PASS and BT_KEY_ALIAS to sign (see README)."
fi
