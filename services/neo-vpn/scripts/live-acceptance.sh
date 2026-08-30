#!/usr/bin/env bash
set -euo pipefail

WG_INTERFACE="${WG_INTERFACE:-wg0}"
EXPECTED_PORT="${EXPECTED_PORT:-51820}"
EXPECTED_ADDRESS="${EXPECTED_ADDRESS:-10.144.1.1/16}"
MAX_HANDSHAKE_AGE="${MAX_HANDSHAKE_AGE:-180}"
ADMIN_PEER_IP="${ADMIN_PEER_IP:-10.144.10.10/32}"
ADMIN_PEER_PUBLIC_KEY="${ADMIN_PEER_PUBLIC_KEY:-}"

fail=0

ok() { printf '[OK] %s\n' "$1"; }
bad() { printf '[FAIL] %s\n' "$1"; fail=1; }

command -v wg >/dev/null 2>&1 && ok "WireGuard installed" || bad "WireGuard installed"
ip link show "$WG_INTERFACE" >/dev/null 2>&1 && ok "$WG_INTERFACE exists" || bad "$WG_INTERFACE exists"
ip -4 addr show dev "$WG_INTERFACE" | grep -Fq "$EXPECTED_ADDRESS" && ok "$WG_INTERFACE has $EXPECTED_ADDRESS" || bad "$WG_INTERFACE has $EXPECTED_ADDRESS"
[[ "$(wg show "$WG_INTERFACE" listen-port 2>/dev/null || true)" == "$EXPECTED_PORT" ]] && ok "WireGuard listens on UDP $EXPECTED_PORT" || bad "WireGuard listens on UDP $EXPECTED_PORT"
[[ "$(sysctl -n net.ipv4.ip_forward 2>/dev/null || true)" == "1" ]] && ok "IPv4 forwarding enabled" || bad "IPv4 forwarding enabled"
systemctl is-enabled wg-quick@"$WG_INTERFACE" >/dev/null 2>&1 && ok "WireGuard enabled at boot" || bad "WireGuard enabled at boot"
systemctl is-enabled nftables >/dev/null 2>&1 && ok "nftables enabled at boot" || bad "nftables enabled at boot"
systemctl is-active nftables >/dev/null 2>&1 && ok "nftables active" || bad "nftables active"

if [[ -f /etc/wireguard/server.key && "$(stat -c '%a' /etc/wireguard/server.key)" == "600" ]]; then
  ok "Server private key exists with mode 600"
else
  bad "Server private key exists with mode 600"
fi

if [[ -n "$ADMIN_PEER_PUBLIC_KEY" ]]; then
  if wg show "$WG_INTERFACE" peers | grep -Fxq "$ADMIN_PEER_PUBLIC_KEY"; then
    ok "Admin peer is enrolled"
  else
    bad "Admin peer is enrolled"
  fi

  allowed="$(wg show "$WG_INTERFACE" allowed-ips | awk -v k="$ADMIN_PEER_PUBLIC_KEY" '$1==k {print $2}')"
  [[ "$allowed" == "$ADMIN_PEER_IP" ]] && ok "Admin peer restricted to $ADMIN_PEER_IP" || bad "Admin peer restricted to $ADMIN_PEER_IP"

  handshake="$(wg show "$WG_INTERFACE" latest-handshakes | awk -v k="$ADMIN_PEER_PUBLIC_KEY" '$1==k {print $2}')"
  now="$(date +%s)"
  if [[ "$handshake" =~ ^[0-9]+$ ]] && (( handshake > 0 && now - handshake <= MAX_HANDSHAKE_AGE )); then
    ok "Admin peer handshake is recent"
  else
    bad "Admin peer handshake is recent (within ${MAX_HANDSHAKE_AGE}s)"
  fi
else
  printf '[INFO] ADMIN_PEER_PUBLIC_KEY not supplied; peer-specific handshake checks skipped.\n'
fi

if nft list ruleset 2>/dev/null | grep -Fq 'iifname "wg0" oifname "wg0" drop'; then
  ok "Peer-to-peer lateral forwarding denied"
else
  bad "Peer-to-peer lateral forwarding denied"
fi

if (( fail == 0 )); then
  echo "NEO VPN Node 001 acceptance gate: PASS"
else
  echo "NEO VPN Node 001 acceptance gate: FAIL"
fi

exit "$fail"
