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

if [[ ! "$PEER_PUBLIC_KEY" =~ ^[A-Za-z0-9+/]{43}=$ ]]; then
  echo "PEER_PUBLIC_KEY does not look like a WireGuard public key." >&2
  exit 1
fi

if [[ ! "$PEER_IP" =~ ^10\.144\.([0-9]{1,3})\.([0-9]{1,3})/32$ ]]; then
  echo "Refusing peer IP outside the NEO VPN 10.144.0.0/16 overlay or without /32." >&2
  exit 1
fi

if (( BASH_REMATCH[1] > 255 || BASH_REMATCH[2] > 255 )); then
  echo "PEER_IP contains an invalid IPv4 octet." >&2
  exit 1
fi

if ! ip link show "$WG_INTERFACE" >/dev/null 2>&1; then
  echo "WireGuard interface $WG_INTERFACE is not active." >&2
  exit 1
fi

if [[ ! -f "$WG_CONFIG" ]]; then
  echo "WireGuard config $WG_CONFIG does not exist." >&2
  exit 1
fi

if grep -Fq "PublicKey = $PEER_PUBLIC_KEY" "$WG_CONFIG"; then
  echo "Peer public key already exists in $WG_CONFIG; refusing duplicate enrollment." >&2
  exit 1
fi

if grep -Fq "AllowedIPs = $PEER_IP" "$WG_CONFIG"; then
  echo "Peer IP $PEER_IP is already assigned; refusing duplicate address." >&2
  exit 1
fi

# Apply to the live interface first. If WireGuard rejects the key/address,
# the persistent configuration remains unchanged.
wg set "$WG_INTERFACE" peer "$PEER_PUBLIC_KEY" allowed-ips "$PEER_IP"

cat >>"$WG_CONFIG" <<EOF

[Peer]
PublicKey = $PEER_PUBLIC_KEY
AllowedIPs = $PEER_IP
EOF

chmod 600 "$WG_CONFIG"
printf 'Enrolled peer %s on %s with %s\n' "$PEER_PUBLIC_KEY" "$WG_INTERFACE" "$PEER_IP"
