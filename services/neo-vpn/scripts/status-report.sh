#!/usr/bin/env bash
set -euo pipefail

WG_INTERFACE="${WG_INTERFACE:-wg0}"
MAX_HANDSHAKE_AGE="${MAX_HANDSHAKE_AGE:-300}"

if ! command -v wg >/dev/null 2>&1; then
  echo "WireGuard is not installed." >&2
  exit 1
fi

if ! ip link show "$WG_INTERFACE" >/dev/null 2>&1; then
  echo "WireGuard interface $WG_INTERFACE is down or missing." >&2
  exit 1
fi

now="$(date +%s)"
listen_port="$(wg show "$WG_INTERFACE" listen-port)"
peer_count="$(wg show "$WG_INTERFACE" peers | sed '/^$/d' | wc -l | tr -d ' ')"

printf 'NEO VPN operational status\n'
printf 'interface=%s\n' "$WG_INTERFACE"
printf 'listen_port=%s\n' "$listen_port"
printf 'peer_count=%s\n' "$peer_count"
printf 'ipv4_forwarding=%s\n' "$(sysctl -n net.ipv4.ip_forward 2>/dev/null || echo unknown)"
printf 'wg_service_active=%s\n' "$(systemctl is-active "wg-quick@${WG_INTERFACE}" 2>/dev/null || true)"
printf 'nftables_active=%s\n' "$(systemctl is-active nftables 2>/dev/null || true)"

echo
printf '%-46s %-24s %-14s %-14s\n' 'peer' 'allowed_ips' 'handshake_age' 'state'
while read -r peer; do
  [[ -z "$peer" ]] && continue
  allowed_ips="$(wg show "$WG_INTERFACE" allowed-ips | awk -v p="$peer" '$1==p {print $2}')"
  handshake="$(wg show "$WG_INTERFACE" latest-handshakes | awk -v p="$peer" '$1==p {print $2}')"

  if [[ -z "$handshake" || "$handshake" == "0" ]]; then
    age="never"
    state="NO_HANDSHAKE"
  else
    delta=$(( now - handshake ))
    age="${delta}s"
    if (( delta <= MAX_HANDSHAKE_AGE )); then
      state="RECENT"
    else
      state="STALE"
    fi
  fi

  printf '%-46s %-24s %-14s %-14s\n' "$peer" "${allowed_ips:-none}" "$age" "$state"
done < <(wg show "$WG_INTERFACE" peers)
