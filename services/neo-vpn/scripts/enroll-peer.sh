#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

: "${PEER_PUBLIC_KEY:?Set PEER_PUBLIC_KEY to the approved peer public key}"
: "${PEER_IP:?Set PEER_IP, for example 10.144.10.10/32}"

WG_INTERFACE="${WG_INTERFACE:-wg0}"
WG_CONFIG="${WG_CONFIG:-/etc/wireguard/wg0.conf}"

if [[ ! "$PEER_IP" =~ ^10\.144\.[0-9]{1,3}\.[0-9]{1,3}/32$ ]]; then
  echo "Refusing peer IP outside the NEO VPN 10.144.0.0/16 overlay or without /32." >&2
  exit 1
fi

if ! wg pubkey >/dev/null 2>&1 <<<"$PEER_PUBLIC_KEY"; then
  # wg pubkey expects a private key, so use wg set validation below instead.
  true
fi

if ! ip link show "$WG_INTERFACE" >/dev/null 2>&1; then
  echo "WireGuard interface $WG_INTERFACE is not active." >&2
  exit 1
fi

if grep -Fq "PublicKey = $PEER_PUBLIC_KEY" "$WG_CONFIG" 2>/dev/null; then
  echo "Peer public key already exists in $WG_CONFIG; refusing duplicate enrollment." >&2
  exit 1
fi

if grep -Fq "AllowedIPs = $PEER_IP" "$WG_CONFIG" 2>/dev/null; then
  echo "Peer IP $PEER_IP is already assigned; refusing duplicate address." >&2
  exit 1
fi

wg set "$WG_INTERFACE" peer "$PEER_PUBLIC_KEY" allowed-ips "$PEER_IP"

cat >>"$WG_CONFIG" <<EOF

[Peer]
PublicKey = $PEER_PUBLIC_KEY
AllowedIPs = $PEER_IP
EOF

chmod 600 "$WG_CONFIG"
wg-quick save "$WG_INTERFACE" >/dev/null 2>&1 || true

printf 'Enrolled peer %s on %s with %s\n' "$PEER_PUBLIC_KEY" "$WG_INTERFACE" "$PEER_IP"
