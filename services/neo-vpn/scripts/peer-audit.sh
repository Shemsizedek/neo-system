#!/usr/bin/env bash
set -euo pipefail

WG_INTERFACE="${WG_INTERFACE:-wg0}"
WG_CONFIG="${WG_CONFIG:-/etc/wireguard/wg0.conf}"

if ! ip link show "$WG_INTERFACE" >/dev/null 2>&1; then
  echo "WireGuard interface $WG_INTERFACE is not active." >&2
  exit 1
fi

runtime_peers="$(mktemp)"
config_peers="$(mktemp)"
trap 'rm -f "$runtime_peers" "$config_peers"' EXIT

wg show "$WG_INTERFACE" peers | sort -u >"$runtime_peers"
awk '/^[[:space:]]*PublicKey[[:space:]]*=/ {print $3}' "$WG_CONFIG" 2>/dev/null | sort -u >"$config_peers"

runtime_count="$(wc -l <"$runtime_peers" | tr -d ' ')"
config_count="$(wc -l <"$config_peers" | tr -d ' ')"

printf 'runtime_peer_count=%s\n' "$runtime_count"
printf 'config_peer_count=%s\n' "$config_count"

if ! diff -u "$config_peers" "$runtime_peers"; then
  echo "Peer drift detected between persistent config and live interface." >&2
  exit 1
fi

# Detect duplicate AllowedIPs in the persistent configuration.
duplicates="$(awk '/^[[:space:]]*AllowedIPs[[:space:]]*=/ {print $3}' "$WG_CONFIG" 2>/dev/null | sort | uniq -d)"
if [[ -n "$duplicates" ]]; then
  echo "Duplicate AllowedIPs detected:" >&2
  echo "$duplicates" >&2
  exit 1
fi

echo "Peer audit passed: runtime and persistent peer sets match; no duplicate AllowedIPs detected."
