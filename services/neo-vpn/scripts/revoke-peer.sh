#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

: "${PEER_PUBLIC_KEY:?Set PEER_PUBLIC_KEY to the peer public key to revoke}"
WG_INTERFACE="${WG_INTERFACE:-wg0}"
WG_CONFIG="${WG_CONFIG:-/etc/wireguard/wg0.conf}"

if [[ ! "$PEER_PUBLIC_KEY" =~ ^[A-Za-z0-9+/]{43}=$ ]]; then
  echo "PEER_PUBLIC_KEY does not look like a WireGuard public key." >&2
  exit 1
fi

if ! wg show "$WG_INTERFACE" peers | grep -Fxq "$PEER_PUBLIC_KEY"; then
  echo "Peer is not active on $WG_INTERFACE." >&2
  exit 1
fi

wg set "$WG_INTERFACE" peer "$PEER_PUBLIC_KEY" remove

python3 - "$WG_CONFIG" "$PEER_PUBLIC_KEY" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
key = sys.argv[2]
text = path.read_text()
blocks = text.split("\n[Peer]\n")
head = blocks[0]
kept = []
removed = False
for block in blocks[1:]:
    if f"PublicKey = {key}" in block:
        removed = True
        continue
    kept.append(block)
new_text = head.rstrip() + "\n"
for block in kept:
    new_text += "\n[Peer]\n" + block.strip() + "\n"
path.write_text(new_text)
if not removed:
    print("warning: peer removed from live interface but no persistent block matched", file=sys.stderr)
PY

chmod 600 "$WG_CONFIG"
printf 'Revoked peer %s from %s\n' "$PEER_PUBLIC_KEY" "$WG_INTERFACE"
