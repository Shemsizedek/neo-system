#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y wireguard nftables qrencode curl ca-certificates

install -d -m 700 /etc/wireguard
install -d -m 700 /etc/neo-vpn

cat >/etc/sysctl.d/99-neo-vpn.conf <<'EOF'
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1
EOF
sysctl --system >/dev/null

systemctl enable nftables
systemctl enable wg-quick@wg0

cat <<'EOF'
NEO VPN gateway prerequisites installed.

Next actions on the host:
1. Generate /etc/wireguard/server.key and server.pub with scripts/generate-server-keys.sh.
2. Install a rendered /etc/wireguard/wg0.conf with chmod 600.
3. Set the real WAN interface in /etc/nftables.conf from nftables/neo-vpn.nft.
4. Run: nft -c -f /etc/nftables.conf
5. Run: systemctl restart nftables
6. Run: systemctl start wg-quick@wg0
7. Validate with scripts/healthcheck.sh.
EOF
