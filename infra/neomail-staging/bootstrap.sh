#!/usr/bin/env bash
set -euo pipefail

HOSTNAME_FQDN="${HOSTNAME_FQDN:-mailtest.holytemples.org}"
STACK_DIR="${STACK_DIR:-/opt/neomail}"

require_root() {
  if [ "${EUID}" -ne 0 ]; then
    echo "Run as root or via sudo." >&2
    exit 1
  fi
}

require_root

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y   ca-certificates curl git docker.io docker-compose-plugin ufw dnsutils

systemctl enable --now docker

hostnamectl set-hostname "${HOSTNAME_FQDN}"

mkdir -p "${STACK_DIR}"
cd "${STACK_DIR}"

if [ ! -f docker-compose.yml ]; then
  echo "docker-compose.yml missing in ${STACK_DIR}; copy the committed NEO Mail staging compose first." >&2
  exit 1
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 25/tcp
ufw allow 443/tcp
ufw allow 465/tcp
ufw allow 993/tcp
ufw --force enable

docker compose pull
docker compose up -d

echo
echo "NEO Mail staging container started."
echo "Next checks:"
echo "1. Confirm forward A/AAAA for ${HOSTNAME_FQDN} resolves to this static IP."
echo "2. Confirm PTR/rDNS of this IP resolves back to ${HOSTNAME_FQDN}."
echo "3. Confirm outbound TCP/25 is permitted by the host."
echo "4. SSH-tunnel localhost:8080 for Stalwart bootstrap."
echo "5. Generate staging DKIM only after the admin setup is complete."
echo "6. Do NOT change production MX records yet."
