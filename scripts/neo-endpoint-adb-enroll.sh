#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
NEO Endpoint ADB enrollment helper

Usage:
  scripts/neo-endpoint-adb-enroll.sh <pairing-host:port> <connect-host:port> [label]

Example:
  scripts/neo-endpoint-adb-enroll.sh 192.168.1.197:37123 192.168.1.197:38113 personal-phone

Security model:
- Run only on an authorized host you control.
- The Android six-digit pairing code is entered interactively into adb when prompted.
- This script does not accept, print, persist, upload, or log the pairing code.
- Never expose an ADB endpoint directly to the public Internet.
EOF
}

if [[ $# -lt 2 || $# -gt 3 ]]; then usage; exit 2; fi

PAIR_TARGET="$1"
CONNECT_TARGET="$2"
LABEL="${3:-neo-endpoint}"

if ! command -v adb >/dev/null 2>&1; then
  echo "ERROR: adb not found. Install Android platform-tools on this authorized host." >&2
  exit 1
fi

is_private_target() {
  local host="${1%%:*}"
  [[ "$host" =~ ^10\. ]] ||
  [[ "$host" =~ ^192\.168\. ]] ||
  [[ "$host" =~ ^172\.(1[6-9]|2[0-9]|3[0-1])\. ]] ||
  [[ "$host" == "localhost" ]] ||
  [[ "$host" == "127.0.0.1" ]]
}

if ! is_private_target "$PAIR_TARGET" || ! is_private_target "$CONNECT_TARGET"; then
  echo "ERROR: enrollment helper refuses non-private ADB targets by default." >&2
  echo "Use a trusted LAN or a private VPN/tunnel that presents a private address." >&2
  exit 1
fi

echo "NEO Endpoint enrollment: $LABEL"
echo "Pair target: $PAIR_TARGET"
echo "Connect target: $CONNECT_TARGET"
echo
echo "Android will prompt for the temporary six-digit code. Type it into adb locally."
adb pair "$PAIR_TARGET"

echo
echo "Connecting to authorized endpoint..."
adb connect "$CONNECT_TARGET"

echo
echo "Visible ADB devices:"
adb devices -l

ADB_PUB="${HOME}/.android/adbkey.pub"
if [[ -f "$ADB_PUB" ]]; then
  if command -v sha256sum >/dev/null 2>&1; then
    FP="$(sha256sum "$ADB_PUB" | awk '{print $1}')"
  else
    FP="$(shasum -a 256 "$ADB_PUB" | awk '{print $1}')"
  fi
  echo
  echo "Authorized-host public-key fingerprint (safe registry value):"
  echo "$FP"
  echo "Do NOT copy ~/.android/adbkey (private key) into NEO, GitHub, chat, or tickets."
fi

echo
echo "Enrollment complete if the device is listed as 'device'."
echo "When the approved development session ends, disconnect with: adb disconnect $CONNECT_TARGET"
