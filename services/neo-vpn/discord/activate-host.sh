#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="neo-vpn-discord.service"
ENV_FILE="${NEO_VPN_DISCORD_ENV_FILE:-/etc/neo-vpn/discord.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAIT_SECONDS="${NEO_VPN_DISCORD_ACTIVATION_WAIT_SECONDS:-20}"

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run as root: sudo bash $SCRIPT_DIR/activate-host.sh" >&2
  exit 1
fi

for command in node npm systemctl; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Missing required command: $command" >&2
    exit 1
  }
done

if [[ ! -f "$ENV_FILE" || "${1:-}" == "--configure" ]]; then
  echo "Configuring the Discord runtime secret file. Input is written only to $ENV_FILE."
  NEO_VPN_DISCORD_ENV_FILE="$ENV_FILE" bash "$SCRIPT_DIR/first-boot.sh"
fi

chmod 0600 "$ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Defense-in-depth: host activation never flips the WireGuard/data-plane gate.
export NEO_VPN_INFRASTRUCTURE_LIVE=false

node "$SCRIPT_DIR/runtime-preflight.mjs"

echo
printf '%s\n' "Discord guild installation URL (contains no bot token):"
node "$SCRIPT_DIR/generate-install-url.mjs"
echo

echo "Installing/restarting the persistent Discord Gateway service..."
NEO_SYSTEM_ROOT="${NEO_SYSTEM_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd)}" \
  bash "$SCRIPT_DIR/install-discord-service.sh"

echo "Waiting up to ${WAIT_SECONDS}s for guild attestation and command registration..."

deadline=$((SECONDS + WAIT_SECONDS))
while (( SECONDS < deadline )); do
  if (
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    export NEO_VPN_INFRASTRUCTURE_LIVE=false
    cd "$SCRIPT_DIR"
    node acceptance-probe.mjs >/tmp/neo-vpn-discord-acceptance.json 2>/dev/null
  ); then
    cat /tmp/neo-vpn-discord-acceptance.json
    rm -f /tmp/neo-vpn-discord-acceptance.json
    echo
    echo "NEO VPN Discord control plane accepted."
    echo "Final operator check: run /vpn-status in the configured Discord guild."
    echo "WireGuard/data-plane execution remains disabled."
    exit 0
  fi
  sleep 2
done

rm -f /tmp/neo-vpn-discord-acceptance.json

echo >&2
echo "Discord control-plane acceptance is not complete yet." >&2
echo "If the bot has not been added to the configured guild, open the installation URL printed above, add it, then rerun this same command." >&2
echo "If it is already installed, inspect: journalctl -u $SERVICE_NAME -n 80 --no-pager" >&2
exit 3
