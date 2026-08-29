# NEO VPN Gateway Deployment Runbook

This runbook activates the NEO VPN foundation on a dedicated Linux host or VM. It assumes Ubuntu/Debian-style package management and a public IPv4 address or equivalent reachable UDP endpoint.

## 1. Host requirements

- dedicated Linux VM or server
- root or sudo access
- public/reachable UDP port `51820`
- at least one network interface with outbound internet access
- provider firewall/security-group access to permit WireGuard UDP ingress
- console or recovery access before applying a deny-by-default host firewall

Do not deploy a production VPN gateway on Vercel, GitHub Pages, or other serverless/static hosting. WireGuard needs kernel/network privileges and persistent UDP networking.

## 2. Copy the NEO VPN service directory

Clone the NEO System repository on the gateway and enter:

```bash
cd services/neo-vpn
```

Review every script before running it on a production host.

## 3. Bootstrap the host

```bash
sudo bash scripts/bootstrap-gateway.sh
```

This installs WireGuard, nftables, QR tooling, and enables IP forwarding. It does not create or expose any private key.

## 4. Generate gateway keys locally

```bash
sudo bash scripts/generate-server-keys.sh
```

The resulting files are:

- `/etc/wireguard/server.key` — secret, mode 600
- `/etc/wireguard/server.pub` — public identity

Never copy `server.key` into Git, chat, email, Discord, CI logs, or issue trackers.

## 5. Create `/etc/wireguard/wg0.conf`

Start from `config/wg0.example.conf`. Insert the server private key directly on the host and add only approved peer public keys.

Recommended gateway interface:

```ini
[Interface]
Address = 10.144.1.1/16
ListenPort = 51820
PrivateKey = <LOCAL_SERVER_PRIVATE_KEY>
```

Each peer must receive one unique `/32` VPN address. Example admin device:

```ini
[Peer]
PublicKey = <ADMIN_PUBLIC_KEY>
AllowedIPs = 10.144.10.10/32
```

Then protect the file:

```bash
sudo chmod 600 /etc/wireguard/wg0.conf
```

## 6. Firewall and NAT

Determine the real WAN interface:

```bash
ip route show default
```

Copy `nftables/neo-vpn.nft` to `/etc/nftables.conf` and change `WAN_IF = "eth0"` if necessary.

**Important:** the template deliberately does not open SSH. Before applying it remotely, ensure you have provider console/recovery access or add a narrowly restricted SSH rule for your management IP.

Validate before applying:

```bash
sudo nft -c -f /etc/nftables.conf
```

Apply:

```bash
sudo systemctl restart nftables
```

## 7. Start WireGuard

```bash
sudo systemctl start wg-quick@wg0
sudo systemctl status wg-quick@wg0 --no-pager
sudo wg show
```

## 8. Provider firewall

At the cloud/provider edge, permit inbound UDP `51820` to the gateway. Do not expose internal NEO service ports publicly merely because the VPN exists.

## 9. Validate the gateway

```bash
sudo bash scripts/healthcheck.sh
```

All checks should report `[OK]` before client enrollment.

## 10. First admin peer

Generate the admin-device key pair on that device, not on GitHub. Add only the public key to the gateway. Assign `10.144.10.10/32` to the first authorized administrative peer.

A client configuration should point to:

```ini
Endpoint = <VPN_PUBLIC_HOST_OR_IP>:51820
```

For access only to NEO private networks, use split tunneling with narrow `AllowedIPs`. Use a full tunnel (`0.0.0.0/0, ::/0`) only when intentionally routing all client internet traffic through NEO VPN.

## 11. Acceptance tests

Before declaring production-ready, verify:

- handshake succeeds
- peer receives only its assigned VPN address
- admin can reach intended private NEO services
- admin cannot reach zones that are not authorized
- private DNS resolves through the intended resolver
- protected traffic does not leak when the tunnel is down if kill-switch policy is enabled
- removed peer loses access immediately
- reboot restores nftables and `wg0`
- no private key exists in repository history or logs

## 12. Emergency revocation

If a peer is lost or compromised:

1. Remove its `[Peer]` entry from `/etc/wireguard/wg0.conf`.
2. Apply the new configuration with `wg syncconf` or restart `wg-quick@wg0`.
3. Revoke any application/session credentials independently of the VPN.
4. Document the incident and issue a new key pair if the device/user is re-enrolled.

The VPN is an access-control layer, not a substitute for application-level authorization.
