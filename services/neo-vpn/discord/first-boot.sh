#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${NEO_VPN_DISCORD_ENV_FILE:-/etc/neo-vpn/discord.env}"
ENV_DIR="$(dirname "$ENV_FILE")"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root so the runtime secret file can be created securely." >&2
  exit 1
fi

read -r -p "Discord Application ID: " DISCORD_APPLICATION_ID
read -r -p "Discord Guild ID: " DISCORD_GUILD_ID
read -r -p "Viewer role IDs (comma-separated): " VIEWER_IDS
read -r -p "Operator role IDs (comma-separated): " OPERATOR_IDS
read -r -p "Admin role IDs (comma-separated): " ADMIN_IDS
read -r -s -p "Discord Bot Token: " DISCORD_BOT_TOKEN
echo

snowflake='^[0-9]{16,22}$'
list_pattern='^[0-9]{16,22}(,[0-9]{16,22})*$'

[[ "$DISCORD_APPLICATION_ID" =~ $snowflake ]] || { echo "Invalid application ID" >&2; exit 1; }
[[ "$DISCORD_GUILD_ID" =~ $snowflake ]] || { echo "Invalid guild ID" >&2; exit 1; }
[[ "$VIEWER_IDS" =~ $list_pattern ]] || { echo "Invalid viewer role IDs" >&2; exit 1; }
[[ "$OPERATOR_IDS" =~ $list_pattern ]] || { echo "Invalid operator role IDs" >&2; exit 1; }
[[ "$ADMIN_IDS" =~ $list_pattern ]] || { echo "Invalid admin role IDs" >&2; exit 1; }
[[ -n "$DISCORD_BOT_TOKEN" ]] || { echo "Bot token required" >&2; exit 1; }

install -d -m 700 "$ENV_DIR"
umask 077
cat > "$ENV_FILE" <<EOF
DISCORD_APPLICATION_ID=$DISCORD_APPLICATION_ID
DISCORD_GUILD_ID=$DISCORD_GUILD_ID
DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN
NEO_VPN_DISCORD_VIEWER_ROLE_IDS=$VIEWER_IDS
NEO_VPN_DISCORD_OPERATOR_ROLE_IDS=$OPERATOR_IDS
NEO_VPN_DISCORD_ADMIN_ROLE_IDS=$ADMIN_IDS
NEO_VPN_INFRASTRUCTURE_LIVE=false
NEO_VPN_RUNTIME_STATE_FILE=/var/lib/neo-vpn/discord-state.json
EOF
chmod 600 "$ENV_FILE"

echo "Created $ENV_FILE with mode 600."
echo "Next: systemctl restart neo-vpn-discord && journalctl -u neo-vpn-discord -n 50 --no-pager"
