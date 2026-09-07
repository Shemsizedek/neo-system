#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="neo-vpn-discord.service"
ENV_FILE="${NEO_VPN_DISCORD_ENV_FILE:-/etc/neo-vpn/discord.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run as root: sudo bash $SCRIPT_DIR/activation-report.sh" >&2
  exit 1
fi

for command in node systemctl; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Missing required command: $command" >&2
    exit 1
  }
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo '{"ok":false,"reason":"discord-env-missing"}'
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
export NEO_VPN_INFRASTRUCTURE_LIVE=false

service_active=false
service_enabled=false
systemctl is-active --quiet "$SERVICE_NAME" && service_active=true || true
systemctl is-enabled --quiet "$SERVICE_NAME" && service_enabled=true || true

acceptance_json='{}'
if acceptance_json="$(cd "$SCRIPT_DIR" && node acceptance-probe.mjs 2>/dev/null)"; then
  :
fi

node - "$acceptance_json" "$service_active" "$service_enabled" <<'NODE'
const [acceptanceRaw, serviceActiveRaw, serviceEnabledRaw] = process.argv.slice(2);
let acceptance = {};
try { acceptance = JSON.parse(acceptanceRaw); } catch {}
const report = {
  ok: Boolean(serviceActiveRaw === 'true' && acceptance.ok),
  service: {
    name: 'neo-vpn-discord.service',
    active: serviceActiveRaw === 'true',
    enabled: serviceEnabledRaw === 'true'
  },
  discord: {
    registrationReady: Boolean(acceptance.registrationReady),
    guildId: acceptance.guildId ?? null,
    commandCount: acceptance.commandCount ?? 0,
    attestationSummary: acceptance.attestationSummary ?? null,
    updatedAt: acceptance.updatedAt ?? null
  },
  vpnDataPlane: {
    enabled: false,
    reason: 'host-activation-report-forces-fail-closed'
  },
  failures: acceptance.failures ?? []
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 3);
NODE
