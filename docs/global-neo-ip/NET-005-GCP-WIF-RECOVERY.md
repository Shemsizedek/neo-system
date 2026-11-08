# GLOBAL NEO IP NET-005 — Missing GCP Workload Identity Provider recovery

**Incident date:** 2026-11-08

## Verified failure

A screenshot of the first trusted-main inventory run showed:
- `verify-parser` — PASS
- `discover-existing-node` — FAIL
- GitHub annotation — `Missing existing authorized GCP variable: GCP_WIF_PROVIDER.`

This error occurred during configuration preflight **before Google Cloud authentication**. It provides **zero evidence** about whether `neo-vpn-node-001` is running, whether a public IP exists, whether bills are due, or whether WireGuard is operational.

## Root cause in repository

The NET-003 job read `vars.GCP_WIF_PROVIDER` only, while the existing `holytemples-production` workflows use `vars.GCP_WIF_PROVIDER || secrets.GCP_WIF_PROVIDER`. NET-005 aligns the read-only audit with existing NEO configuration resolution for the same three approved names:
- `GCP_PROJECT_ID`
- `GCP_WIF_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

It does **not** automatically substitute `GCP_CLOUD_RUN_SERVICE_ACCOUNT` (which may have broader/other permissions), reuse the `holytemples-production` environment, copy a secret, create a Google service account, change IAM, or configure a new identity pool.

If these values are not configured for `neo-vpn-plan` or repository scope, this workflow will still fail closed and report each missing name without printing values.

## Recovery (authorized GitHub/GCP administrator)

1. Under GitHub repository **Settings → Environments → neo-vpn-plan**, check the existing *environment variables* and *environment secrets*. Then check repository **Settings → Secrets and variables → Actions**.
2. Confirm that the exact `GCP_WIF_PROVIDER` value was already provisioned for the target NEO VPN Google Cloud project and trusted `refs/heads/main`. The required format is:
   `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID`
   where `PROJECT_NUMBER` is the **numeric** Google Cloud project number, not the textual project ID.
3. If a verified provider already exists but its value is absent from the approved GitHub scope, register that existing provider name in `neo-vpn-plan` or the approved repository variables/secrets. Confirm the existing `GCP_SERVICE_ACCOUNT` email is the intended VPN *read-only inventory* identity or explicitly approved deployer identity with LIST permissions. Do not paste secrets, private keys or access tokens into GitHub issues or chats.
4. If **no** provider exists, this is **not** solved by choosing a guess or bypassing authentication. An authorized Google Cloud IAM administrator must review the GitHub workload identity trust, service account policy and budget. **Do not run `services/neo-vpn/infra/gcp/configure-wif.sh` automatically:** that script enables APIs, creates identities if absent and grants `roles/compute.admin`; it is a *mutating deployment setup*, not a read-only diagnostic.
5. Re-run the read-only GitHub workflow only from trusted `main`. Inspect the `discover-existing-node` job; if credentials/permissions succeed, capture the sanitized inventory classification. The workflow's push trigger will automatically make one safe attempt when this reviewed fix is merged.
6. `FOUND` does **not** mean a live VPN. Verify actual `wg0`, approved peer handshakes, segment isolation, revocation and reboot before promoting NET-002 guest/partner access.

## Decisions preserved

- No new resource, billed compute, reserved IP, service account, WIF provider or IAM grant is created by NET-005.
- No VPN client enrollment, public BGP announcement, DNS change, or firewall apply is authorized.
- An absent/invalid provider yields `UNVERIFIED`, never `NO_NODE` or `OFFLINE`.
- The Node 20 deprecation annotation from `actions/setup-node@v4` is **not** the cause of the inventory failure; the workflow uses Node 24 and parser tests passed. A later separate maintenance task can upgrade that action.
