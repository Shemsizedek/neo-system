#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

WG_INTERFACE="${WG_INTERFACE:-wg0}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-/var/lib/neo-vpn/incidents/${STAMP}}"

install -d -m 700 "$SNAPSHOT_DIR"

wg show "$WG_INTERFACE" >"$SNAPSHOT_DIR/wg-show.txt" 2>/dev/null || true
ip addr show "$WG_INTERFACE" >"$SNAPSHOT_DIR/ip-addr.txt" 2>/dev/null || true
nft list ruleset >"$SNAPSHOT_DIR/nftables.txt" 2>/dev/null || true
systemctl status "wg-quick@${WG_INTERFACE}" --no-pager >"$SNAPSHOT_DIR/wg-service.txt" 2>&1 || true

# Stop the VPN data plane without deleting keys or configuration.
systemctl stop "wg-quick@${WG_INTERFACE}" || true

if ip link show "$WG_INTERFACE" >/dev/null 2>&1; then
  echo "Failed to disable $WG_INTERFACE." >&2
  exit 1
fi

printf 'NEO VPN emergency disable complete.\n'
printf 'snapshot=%s\n' "$SNAPSHOT_DIR"
printf 'status=DISABLED\n'
printf 'Re-enable only after incident review with: systemctl start wg-quick@%s\n' "$WG_INTERFACE"
