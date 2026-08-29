#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y wireguard wireguard-tools nftables curl jq

cat >/etc/sysctl.d/99-neo-vpn.conf <<'EOF'
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1
EOF
sysctl --system

install -d -m 700 /etc/wireguard
install -d -m 700 /var/lib/neo-vpn

if [[ ! -f /etc/wireguard/server.key ]]; then
  umask 077
  wg genkey | tee /etc/wireguard/server.key | wg pubkey >/etc/wireguard/server.pub
fi

chmod 600 /etc/wireguard/server.key
chmod 644 /etc/wireguard/server.pub

cat >/etc/wireguard/wg0.conf <<EOF
[Interface]
Address = 10.144.1.1/16
ListenPort = 51820
PrivateKey = $(cat /etc/wireguard/server.key)
SaveConfig = false
EOF
chmod 600 /etc/wireguard/wg0.conf

WAN_IFACE="$(ip route show default | awk '/default/ {print $5; exit}')"
cat >/etc/nftables.conf <<EOF
flush ruleset

table inet neo_vpn_filter {
  chain input {
    type filter hook input priority 0; policy drop;
    iifname "lo" accept
    ct state established,related accept
    ip protocol icmp accept
    ip6 nexthdr icmpv6 accept
    ip saddr 35.235.240.0/20 tcp dport 22 accept
    udp dport 51820 accept
  }

  chain forward {
    type filter hook forward priority 0; policy drop;
    ct state established,related accept
    iifname "wg0" oifname "${WAN_IFACE}" accept
    iifname "wg0" oifname "wg0" drop
  }

  chain output {
    type filter hook output priority 0; policy accept;
  }
}

table ip neo_vpn_nat {
  chain postrouting {
    type nat hook postrouting priority 100; policy accept;
    ip saddr 10.144.0.0/16 oifname "${WAN_IFACE}" masquerade
  }
}
EOF

systemctl enable --now nftables
systemctl enable --now wg-quick@wg0

touch /var/lib/neo-vpn/node-001-ready
