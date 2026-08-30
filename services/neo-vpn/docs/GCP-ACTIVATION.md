# NEO VPN — Google Cloud Activation

This runbook activates NEO VPN Node 001 without storing a Google service-account JSON key in GitHub.

## Authentication model

GitHub Actions authenticates to Google Cloud with OpenID Connect and Google Workload Identity Federation. The workflow requests a short-lived GitHub OIDC token and exchanges it for Google credentials at runtime.

Required GitHub variables:

- `GCP_PROJECT_ID`
- `GCP_WIF_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_REGION` (defaults to `us-central1`)
- `GCP_ZONE` (defaults to `us-central1-a`)
- `GCP_NETWORK_NAME` (defaults to `default`)

Do not add a Google service-account JSON key.

## One-time Google Cloud bootstrap

From an already-authenticated administrator workstation with the Google Cloud CLI installed:

```bash
export GCP_PROJECT_ID="YOUR_PROJECT_ID"
export GITHUB_REPOSITORY="Shemsizedek/neo-system"
bash services/neo-vpn/infra/gcp/configure-wif.sh
```

The script enables the required APIs, creates/reuses a dedicated deployment service account, creates/reuses the GitHub workload identity pool/provider, binds the repository identity, and prints the exact values to place in GitHub variables.

## GitHub environments

Create two GitHub environments:

- `neo-vpn-plan`: read-only planning context; no manual approval required.
- `neo-vpn-production`: production apply context; configure required reviewers before permitting deployment.

The apply job is intentionally manual through `workflow_dispatch`.

## Activation

1. Run **NEO VPN GCP** with action `plan`.
2. Review the Terraform plan.
3. Run **NEO VPN GCP** with action `apply`.
4. Approve the `neo-vpn-production` environment gate.
5. Record the workflow's `neo_vpn_node_001_public_ip` output.
6. Connect through Google Cloud IAP and run the NEO VPN gateway health check.
7. Retrieve `/etc/wireguard/server.pub`; never retrieve or copy `/etc/wireguard/server.key` into GitHub.
8. Enroll the first administrator peer as `10.144.10.10/32`.
9. Confirm a WireGuard handshake and protected-route connectivity.

Node 001 is not considered live until the handshake and acceptance tests pass.

## Emergency boundary

If the deployment identity is suspected of misuse, disable the Workload Identity Provider or remove the service-account `roles/iam.workloadIdentityUser` binding. If a VPN peer is compromised, remove that peer's public key from `wg0` immediately; do not rotate unrelated peers unless required.
