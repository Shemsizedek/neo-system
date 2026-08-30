#!/usr/bin/env bash
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/neo-system}
SERVICE_USER=${SERVICE_USER:-neo-world-mint}
SERVICE_GROUP=${SERVICE_GROUP:-neo-world-mint}
ENV_DIR=/etc/neo
STATE_DIR=/var/lib/neo-world-mint
SERVICE_NAME=world-mint.service

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo 'Run as root.' >&2
  exit 1
fi

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$STATE_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

install -d -m 0750 -o "$SERVICE_USER" -g "$SERVICE_GROUP" "$STATE_DIR"
install -d -m 0750 -o root -g "$SERVICE_GROUP" "$ENV_DIR"

if [[ ! -f "$ENV_DIR/world-mint.env" ]]; then
  install -m 0600 -o "$SERVICE_USER" -g "$SERVICE_GROUP" \
    "$APP_DIR/deploy/world-mint/world-mint.env.example" "$ENV_DIR/world-mint.env"
  echo "Created $ENV_DIR/world-mint.env — populate real secrets before starting."
fi

install -m 0644 "$APP_DIR/deploy/world-mint/world-mint.service" "/etc/systemd/system/$SERVICE_NAME"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

echo 'World Mint host package installed.'
echo 'Next: populate /etc/neo/world-mint.env, run npm run nibiru-pool:preflight, then start world-mint.service.'
