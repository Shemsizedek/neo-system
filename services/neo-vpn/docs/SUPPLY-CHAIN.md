# NEO VPN Supply-Chain and Activation Controls

This document defines the repository-side controls required before the first production deployment of NEO VPN Node 001.

## GitHub Actions pinning

Production workflow actions are pinned to immutable commit SHAs instead of floating major-version tags.

Approved pins:

- `actions/checkout` v7.0.1 -> `3d3c42e5aac5ba805825da76410c181273ba90b1`
- `google-github-actions/auth` v3.0.0 -> `7c6bc770dae815cd3e89ee6cdf493a5fab2cc093`
- `hashicorp/setup-terraform` v4.0.1 -> `dfe3c3f87815947d99a8997f908cb6525fc44e9e`

When upgrading an action, verify the upstream release/tag and replace the full commit SHA deliberately.

## Terraform dependency lock

`.terraform.lock.hcl` is not ignored. The first trusted `terraform init` should generate the dependency lock file and it should then be reviewed and committed so provider selections and checksums are reproducible.

Do not hand-author provider hashes.

## Production activation order

1. Run `configure-wif.sh` from an authenticated Google Cloud administrator session.
2. Run `bootstrap-state.sh` using the selected globally unique private state bucket.
3. Configure the GitHub `neo-vpn-plan` and `neo-vpn-production` environments and required variables.
4. Run the workflow from `refs/heads/main` with `action=plan`.
5. Review the complete Terraform plan before any apply.
6. Run `action=apply` from `refs/heads/main` only after approval.
7. Capture the public IP and run the Node 001 live-enrollment and acceptance process.

## Required GitHub variables

- `GCP_PROJECT_ID`
- `GCP_WIF_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_TF_STATE_BUCKET`
- `GCP_REGION` (defaults to `us-central1`)
- `GCP_ZONE` (defaults to `us-central1-a`)
- `GCP_NEO_VPN_SUBNET` (defaults to `10.145.1.0/24`)

## Boundaries

No Google service-account JSON key is required. Do not place cloud credentials, WireGuard private keys, wallet secrets, CES credentials, recovery codes, or application secrets in GitHub.

Repository readiness is not equivalent to a live VPN. Node 001 is live only after cloud provisioning, first-peer enrollment, successful WireGuard handshake, acceptance testing, revocation testing, and reboot/persistence validation.
