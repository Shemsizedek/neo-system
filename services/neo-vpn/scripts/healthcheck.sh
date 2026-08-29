#!/usr/bin/env bash
set -euo pipefail

fail=0

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf '[OK] %s\n' "$name"
  else
    printf '[FAIL] %s\n' "$name"
    fail=1
  fi
}

check "WireGuard installed" command -v wg
check "nftables installed" command -v nft
check "IPv4 forwarding enabled" sh -c 'test "$(sysctl -n net.ipv4.ip_forward)" = "1"'
check "wg0 configuration exists" test -f /etc/wireguard/wg0.conf
check "wg0 interface is up" ip link show wg0
check "WireGuard is listening" sh -c 'wg show wg0 listen-port | grep -Eq "^[0-9]+$"'
check "nftables ruleset loads" nft list ruleset

if [[ -f /etc/wireguard/server.key ]]; then
  perms=$(stat -c '%a' /etc/wireguard/server.key)
  if [[ "$perms" == "600" ]]; then
    echo "[OK] Server private-key permissions are 600"
  else
    echo "[FAIL] Server private-key permissions are $perms (expected 600)"
    fail=1
  fi
else
  echo "[FAIL] Server private key is missing"
  fail=1
fi

exit "$fail"
