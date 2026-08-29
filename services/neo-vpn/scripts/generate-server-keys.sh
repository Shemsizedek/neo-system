#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

umask 077
install -d -m 700 /etc/wireguard

if [[ -e /etc/wireguard/server.key ]]; then
  echo "Refusing to overwrite existing /etc/wireguard/server.key" >&2
  exit 1
fi

wg genkey | tee /etc/wireguard/server.key | wg pubkey > /etc/wireguard/server.pub
chmod 600 /etc/wireguard/server.key
chmod 644 /etc/wireguard/server.pub

echo "Server keypair created locally on this host."
echo "Public key: $(cat /etc/wireguard/server.pub)"
echo "Private key remains only in /etc/wireguard/server.key."
