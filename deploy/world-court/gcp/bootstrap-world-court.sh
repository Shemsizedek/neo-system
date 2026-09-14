#!/usr/bin/env bash
set -euo pipefail

DOMAIN="court.holytemples.org"
REPO="https://github.com/Shemsizedek/neo-system.git"
APP_DIR="/opt/neo-system"
DATA_DIR="/var/lib/neo-world-court"
ENV_DIR="/etc/neo"
ENV_FILE="$ENV_DIR/world-court.env"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx openssl gnupg dnsutils

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(`.`)[0]' 2>/dev/null || echo 0)" != "24" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

if ! id neo >/dev/null 2>&1; then
  useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin neo
fi

if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --depth=1 origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone --depth=1 --branch main "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
npm ci
npm run build

install -d -m 0750 -o neo -g neo "$DATA_DIR"
install -d -m 0750 -o root -g neo "$ENV_DIR"
if [[ ! -f "$ENV_FILE" ]]; then
  umask 077
  cat >"$ENV_FILE" <<EOF
NODE_ENV=production
PORT=8787
NEO_TRIBUNAL_DB=$DATA_DIR/neo-tribunal.sqlite
NEO_TRIBUNAL_MASTER_KEY=$(openssl rand -hex 32)
NEO_TRIBUNAL_RECEIPT_KEY=$(openssl rand -hex 32)
NEO_TRIBUNAL_SERVICE_RECORD_KEY=$(openssl rand -hex 32)
EOF
  chown root:neo "$ENV_FILE"
  chmod 0640 "$ENV_FILE"
fi

cp "$APP_DIR/deploy/world-court/neo-world-court.service" /etc/systemd/system/neo-world-court.service
systemctl daemon-reload
systemctl enable neo-world-court.service
systemctl restart neo-world-court.service

cp "$APP_DIR/deploy/world-court/nginx.conf" /etc/nginx/sites-available/world-court
ln -sfn /etc/nginx/sites-available/world-court /etc/nginx/sites-enabled/world-court
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

cat >/usr/local/sbin/world-court-tls.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
DOMAIN="court.holytemples.org"
CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

# A redeploy replaces the base Nginx site file, which can remove Certbot's
# HTTPS directives even though the certificate itself remains on disk.
# Exit only when both the certificate AND an active 443 server are present.
if [[ -f "$CERT" ]] && nginx -T 2>/dev/null | grep -Eq 'listen[[:space:]]+443([[:space:]]|;)'; then
  exit 0
fi

IP="$(curl -fsS -H 'Metadata-Flavor: Google' 'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip')"
DNS="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u)"
if grep -qx "$IP" <<<"$DNS"; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect --keep-until-expiring
  nginx -t
  systemctl reload nginx
fi
EOF
chmod 0755 /usr/local/sbin/world-court-tls.sh

cat >/etc/systemd/system/world-court-tls.service <<'EOF'
[Unit]
Description=Provision TLS for court.holytemples.org after DNS cutover
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/world-court-tls.sh
EOF

cat >/etc/systemd/system/world-court-tls.timer <<'EOF'
[Unit]
Description=Retry World Court TLS provisioning

[Timer]
OnBootSec=2min
OnUnitActiveSec=10min
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now world-court-tls.timer
# Run once immediately so a normal redeploy restores HTTPS without waiting for
# the timer. Failure is retried by the timer and caught by the deployment gate.
/usr/local/sbin/world-court-tls.sh || true

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1/health >/dev/null; then
    echo "World Court backend is healthy."
    exit 0
  fi
  sleep 2
done

journalctl -u neo-world-court.service --no-pager -n 100 || true
exit 1
