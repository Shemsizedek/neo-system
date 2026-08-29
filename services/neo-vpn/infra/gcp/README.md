# NEO VPN Node 001 — Google Cloud

This directory defines the first persistent NEO VPN gateway as Google Cloud infrastructure-as-code.

## What it creates

- one reserved public IPv4 address
- one Debian 12 Compute Engine VM named `neo-vpn-node-001`
- IP forwarding enabled on the VM
- Shielded VM controls enabled
- UDP 51820 ingress for WireGuard
- TCP 22 ingress restricted to Google Cloud IAP (`35.235.240.0/20`)
- OS Login enabled
- startup bootstrap that installs WireGuard + nftables, enables forwarding, generates the server key locally, configures `wg0` at `10.144.1.1/16`, and starts the gateway

## Security model

The WireGuard server private key is generated on Node 001 at first boot and remains under `/etc/wireguard/server.key` with mode `0600`. Terraform, GitHub, and this repository never receive that private key.

Terraform state can contain infrastructure metadata and must not be committed. The repository `.gitignore` blocks `*.tfstate`, `*.tfvars`, and `.terraform/`.

The host firewall is deny-by-default for inbound traffic. SSH is accepted only from the Google IAP TCP forwarding range. Do not add a public `0.0.0.0/0` SSH rule.

## Deploy

Prerequisites:

1. A Google Cloud project with billing enabled.
2. Compute Engine API enabled.
3. Terraform authenticated to that project using an authorized operator identity or workload identity.
4. IAM permissions to create Compute Engine instances, addresses, and firewall rules.
5. IAP/OS Login permissions for the administrator who will manage the node.

Create a local variables file from the example:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Set `project_id`, then run:

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

The output `neo_vpn_node_001_public_ip` is the public WireGuard endpoint.

## Verify after apply

Use IAP SSH rather than exposing SSH publicly:

```bash
gcloud compute ssh neo-vpn-node-001 \
  --zone us-central1-a \
  --tunnel-through-iap
```

Then verify:

```bash
sudo systemctl status wg-quick@wg0 --no-pager
sudo wg show
sudo nft list ruleset
sudo cat /etc/wireguard/server.pub
```

The final command prints the server **public** key. It is safe to use when generating client configurations. Never print or copy `/etc/wireguard/server.key` into GitHub, chat, tickets, logs, or documentation.

## First peer

The first admin peer is reserved as `10.144.10.10/32`. Generate that peer's private/public keypair on the administrator's own device. Only the peer public key should be added to Node 001.

Example server-side peer block:

```ini
[Peer]
PublicKey = <ADMIN_DEVICE_PUBLIC_KEY>
AllowedIPs = 10.144.10.10/32
```

Apply the peer with `wg set` or by securely updating `/etc/wireguard/wg0.conf` on Node 001, then validate a handshake with `sudo wg show`.

## Acceptance gate

Node 001 is considered live only after all of these pass:

- reserved public IP exists
- UDP 51820 is reachable from an authorized client path
- `wg0` is active at `10.144.1.1/16`
- first admin peer handshakes successfully
- peer receives only its intended routes
- peer-to-peer lateral traffic is blocked unless explicitly allowed
- IAP SSH works and public SSH does not
- reboot preserves WireGuard and nftables services
- server private key remains only on the gateway
- emergency peer revocation has been tested

## Destruction protection

The VM resource uses Terraform `prevent_destroy = true`. Removing Node 001 therefore requires an explicit code change and review rather than an accidental `terraform destroy`.
