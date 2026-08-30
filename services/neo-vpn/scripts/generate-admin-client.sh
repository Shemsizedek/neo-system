#!/usr/bin/env bash
set -euo pipefail

: "${VPN_ENDPOINT:?Set VPN_ENDPOINT, for example 203.0.113.10:51820}"
: "${SERVER_PUBLIC_KEY:?Set SERVER_PUBLIC_KEY from Node 001 /etc/wireguard/server.pub}"

ADMIN_ADDRESS="${ADMIN_ADDRESS:-10.144.10.10/32}"
ALLOWED_IPS="${ALLOWED_IPS:-10.144.0.0/16}"
DNS_SERVER="${DNS_SERVER:-10.144.1.1}"
OUTPUT_DIR="${OUTPUT_DIR:-./neo-vpn-admin}"

if [[ ! "$SERVER_PUBLIC_KEY" =~ ^[A-Za-z0-9+/]{43}=$ ]]; then
  echo "SERVER_PUBLIC_KEY does not look like a WireGuard public key." >&2
  exit 1
fi

command -v wg >/dev/null 2>&1 || { echo "WireGuard tools are required." >&2; exit 1; }

umask 077
mkdir -p "$OUTPUT_DIR"

if [[ -e "$OUTPUT_DIR/private.key" || -e "$OUTPUT_DIR/admin.conf" ]]; then
  echo "Refusing to overwrite existing admin key/config in $OUTPUT_DIR." >&2
  exit 1
fi

wg genkey | tee "$OUTPUT_DIR/private.key" | wg pubkey > "$OUTPUT_DIR/public.key"

cat > "$OUTPUT_DIR/admin.conf" <<EOF
[Interface]
PrivateKey = $(cat "$OUTPUT_DIR/private.key")
Address = $ADMIN_ADDRESS
DNS = $DNS_SERVER

[Peer]
PublicKey = $SERVER_PUBLIC_KEY
Endpoint = $VPN_ENDPOINT
AllowedIPs = $ALLOWED_IPS
PersistentKeepalive = 25
EOF

chmod 600 "$OUTPUT_DIR/private.key" "$OUTPUT_DIR/admin.conf"
chmod 644 "$OUTPUT_DIR/public.key"

cat <<EOF
Admin client created locally in: $OUTPUT_DIR
Public key: $(cat "$OUTPUT_DIR/public.key")
Assigned address: $ADMIN_ADDRESS
Protected routes: $ALLOWED_IPS

Only public.key should be supplied to the gateway enrollment command.
Do not upload private.key or admin.conf to GitHub, chat, email, or shared storage.
EOF
