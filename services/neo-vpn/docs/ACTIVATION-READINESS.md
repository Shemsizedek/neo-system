# NEO VPN Node 001 Activation Readiness

Node 001 is considered **activation-ready** when all repository checks pass and the Google Cloud trust relationship is configured.

## Repository-side checks

- Terraform formatting passes.
- `terraform init -backend=false` succeeds.
- `terraform validate` succeeds.
- No Google service-account JSON key is committed.
- No WireGuard private key is committed.
- Production apply remains manually gated.

## Required GitHub variables

Configure these after running `services/neo-vpn/infra/gcp/configure-wif.sh` from an authenticated Google Cloud administrator shell:

- `GCP_PROJECT_ID`
- `GCP_WIF_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_REGION` (optional; defaults to `us-central1`)
- `GCP_ZONE` (optional; defaults to `us-central1-a`)
- `GCP_NETWORK_NAME` (optional; defaults to `default`)

## Environments

Create:

- `neo-vpn-plan`
- `neo-vpn-production`

The production environment should require an explicit reviewer before deployment.

## Live declaration

Do not call Node 001 live merely because Terraform applied. Declare it live only after all of the following are verified:

1. The VM is running with the expected reserved public IPv4 address.
2. UDP 51820 is reachable.
3. `wg0` is active and listening on 51820.
4. `/etc/wireguard/server.key` is mode 600 and never leaves the VM.
5. The first approved admin peer is enrolled with a unique public key and `10.144.10.10/32`.
6. The peer completes a recent WireGuard handshake.
7. The peer can reach only the intended NEO private routes.
8. Peer-to-peer lateral access remains denied unless explicitly authorized.
9. Revoking the peer removes access.
10. The gateway survives reboot with WireGuard and nftables active.

Until these checks pass, status is **provisioned, not live**.
