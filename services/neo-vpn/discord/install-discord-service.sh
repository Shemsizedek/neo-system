#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo 'Run as root: sudo bash install-discord-service.sh' >&2
  exit 1
fi

ROOT_DIR="${NEO_SYSTEM_ROOT:-/opt/neo-system}"
SERVICE_DIR="$ROOT_DIR/services/neo-vpn/discord"
ENV_DIR="/etc/neo-vpn"
ENV_FILE="$ENV_DIR/discord.env"
UNIT_SRC="$SERVICE_DIR/neo-vpn-discord.service.example"
UNIT_DST="/etc/systemd/system/neo-vpn-discord.service"

for command in node npm systemctl install; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Missing required command: $command" >&2
    exit 1
  }
done

[[ -d "$SERVICE_DIR" ]] || {
  echo "Discord service directory not found: $SERVICE_DIR" >&2
  exit 1
}

install -d -m 0750 "$ENV_DIR"
install -d -m 0750 /var/log/neo-vpn-discord

if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'ENV'
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_GUILD_ID=
NEO_VPN_DISCORD_VIEWER_ROLE_IDS=
NEO_VPN_DISCORD_OPERATOR_ROLE_IDS=
NEO_VPN_DISCORD_ADMIN_ROLE_IDS=
NEO_VPN_INFRASTRUCTURE_LIVE=false
ENV
  chmod 0600 "$ENV_FILE"
  echo "Created $ENV_FILE. Populate it with Discord IDs/token, then rerun this installer." >&2
  exit 2
fi

chmod 0600 "$ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

node "$SERVICE_DIR/runtime-preflight.mjs"

cd "$SERVICE_DIR"
npm install --omit=dev --no-audit --no-fund

install -m 0644 "$UNIT_SRC" "$UNIT_DST"
systemctl daemon-reload
systemctl enable neo-vpn-discord.service
systemctl restart neo-vpn-discord.service

sleep 2
systemctl --no-pager --full status neo-vpn-discord.service || {
  journalctl -u neo-vpn-discord.service -n 50 --no-pager >&2 || true
  exit 1
}

echo 'NEO VPN Discord Gateway service is active.'
