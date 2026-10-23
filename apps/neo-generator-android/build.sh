#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [ -z "$SDK" ]; then echo 'Android SDK is required (ANDROID_SDK_ROOT or ANDROID_HOME).' >&2; exit 1; fi
TOOLS="$SDK/build-tools/35.0.0"
PLATFORM="$SDK/platforms/android-35/android.jar"
for tool in aapt d8 zipalign apksigner; do test -x "$TOOLS/$tool" || { echo "Missing Android SDK tool: $tool" >&2; exit 1; }; done
test -f "$PLATFORM"
OUT="$ROOT/build/neo-generator-preview"
mkdir -p "$OUT"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/classes" "$WORK/dex" "$WORK/assets"
for file in index.html styles.css core.js app.js; do cp "$ROOT/public/neo-cloud-miner/$file" "$WORK/assets/$file"; done
javac --release 8 -encoding UTF-8 -classpath "$PLATFORM" -d "$WORK/classes" "$ROOT/apps/neo-generator-android/src/org/neo/generator/preview/MainActivity.java"
jar cf "$WORK/classes.jar" -C "$WORK/classes" .
"$TOOLS/d8" --min-api 26 --lib "$PLATFORM" --output "$WORK/dex" "$WORK/classes.jar"
"$TOOLS/aapt" package -f -M "$ROOT/apps/neo-generator-android/AndroidManifest.xml" -S "$ROOT/apps/neo-generator-android/res" -A "$WORK/assets" -I "$PLATFORM" -F "$WORK/unsigned.apk"
(cd "$WORK/dex" && zip -q -u "$WORK/unsigned.apk" classes.dex)
"$TOOLS/zipalign" -f 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"
# Evaluation-only certificate. Never use this temporary key for a public retail release.
keytool -genkeypair -keystore "$WORK/preview.keystore" -storepass android -keypass android -alias androiddebugkey -dname 'CN=NEO Generator Evaluation,OU=Project 144' -keyalg RSA -keysize 3072 -validity 3650 -noprompt
APK="$OUT/neo-generator-0.1.0-preview.apk"
"$TOOLS/apksigner" sign --ks "$WORK/preview.keystore" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "$APK" "$WORK/aligned.apk"
"$TOOLS/apksigner" verify --verbose --print-certs "$APK" > "$OUT/signature-verification.txt"
"$TOOLS/zipalign" -c 4 "$APK"
"$TOOLS/aapt" dump badging "$APK" > "$OUT/apk-manifest.txt"
"$TOOLS/aapt" dump permissions "$APK" > "$OUT/apk-permissions.txt"
COMMIT="$(git -C "$ROOT" rev-parse HEAD)"
printf '{"applicationId":"org.neo.generator.preview","version":"0.1.0-preview","sourceCommit":"%s","minSdk":26,"targetSdk":35,"retailReady":false,"miningEnabled":false,"purchasesEnabled":false,"tokenIssuanceEnabled":false,"signing":"temporary-evaluation-certificate"}\n' "$COMMIT" > "$OUT/build-info.json"
(cd "$OUT" && sha256sum neo-generator-0.1.0-preview.apk > SHA256SUMS)
echo "Verified evaluation APK: $APK"
