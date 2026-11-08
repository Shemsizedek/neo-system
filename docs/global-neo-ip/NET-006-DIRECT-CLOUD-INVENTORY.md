# GLOBAL-NEO-IP-NET-006 — Recovery without GitHub Workload Identity

Date: 2026-11-08
Status: OPERATOR READ-ONLY TOOL AVAILABLE; LIVE GATEWAY UNVERIFIED
Canonical work: existing NEO VPN Node 001, Gate 114, #1367. Do not create a second gateway.

## Why this gate exists

NET-004's trusted GitHub Actions inventory failed **before authentication** because `GCP_WIF_PROVIDER` was missing. NET-005 added GitHub Vars/Secrets fallback; the actual runtime status is still not established. The previous screenshot does not establish node state or billing. SentinelX currently has no connected host, so there is no alternate active remote shell.

NET-006 introduces a second way to inspect the **existing** Google Cloud project using an already-authorized operator's Google Cloud session, even when GitHub's WIF provider reference is missing.

## Safe operator execution

On an existing authenticated Google Cloud CLI or Google Cloud Shell session:

1. Confirm the selected project is NEO's *already owned/authorized* project. Do not create a new project or enable billing.
2. Obtain this repository through the user's authorized GitHub access and navigate to its root.
3. Execute only:

```bash
bash services/neo-vpn/diagnostics/direct-gcp-readonly.sh EXISTING_GCP_PROJECT_ID
```

If the existing project is already selected in the CLI, the script can also be run without the argument. The script uses `gcloud config get-value project` only as a read-only default; it inspects exactly one project.

This script requires `gcloud`, `bash` and `node`. It does NOT request cloud credentials, run `gcloud auth login`, enable APIs, assign IAM permissions, create a bucket, create an instance, create a public IP, execute Terraform, or modify firewall rules.

The script writes temporary instance/address/provider JSON to a local private temporary directory and removes the files at exit. It prints only sanitized classification, plus the existing Workload Identity provider resource path and service-account email **if they can be verified**. These names are configuration identifiers, not private keys. Do not post operator environment logs publicly without review.

## Results and decisions

- `inventory=FOUND`, `machine_running=true` and `public_address_reserved=true`: an apparently usable existing cloud host exists in this project, but no UDP reachability, `wg0` or handshakes are certified. Proceed to the existing Node 001 host audit.
- `NOT_FOUND_IN_AUTHORIZED_PROJECT`: the target VM is not in **this selected project**. Reconcile historical projects/provider records before any new hosting.
- `COMPUTE_INVENTORY=UNVERIFIED_OR_DENIED`: account lacks read permission or Compute API isn't accessible. Never interpret this as a stopped or nonexistent VM. WIF verification continues separately if permitted.
- `WIF_PROVIDER_SCOPE=APPEARS_ACTIVE_AND_MAIN_RESTRICTED`: default repo WIF pool `github` / provider `neo-system` appears available with a trusted-main restriction. This is **not** proof of a complete IAM trust chain or effective service-account permissions; verify that separately.
- `WIF_PROVIDER_SCOPE=NOT_FOUND_OR_ACCESS_DENIED_FOR_THIS_POOL`: provider isn't visible under these default names. A different existing ID may be in use; if so, set `NEO_VPN_WIF_POOL_ID` / `NEO_VPN_WIF_PROVIDER_ID` for that existing identity. No provider is created.
- `SERVICE_ACCOUNT=EXISTS_NOT_PERMISSION_CERTIFIED`: `neo-vpn-deployer` exists. Verify its effective least-privilege permissions separately; existence does not imply authority.
- `NODE_LIVE=NOT_CERTIFIED`: this always remains true until actual authorized host-level WireGuard, two-peer routing, app authorization, fail-closed guest segmentation, revocation and reboot acceptance pass.

## Recover the original missing GitHub configuration

If the output shows the **verified existing** provider resource path, copy *only* the `WIF_PROVIDER_RESOURCE` value into the approved `GCP_WIF_PROVIDER` GitHub Variable for environment `neo-vpn-plan` (or authorized repository variable/secret). Verify the actual account has the correct trust permissions and that `GCP_SERVICE_ACCOUNT` references the intended least-privilege read-only identity. A developer/deployer identity holding `roles/compute.admin` is not the preferred audit identity.

Do **not** blindly run `services/neo-vpn/infra/gcp/configure-wif.sh` because it can enable APIs, create service accounts, update identity pools and grant project-wide Compute Admin. Any such IAM change requires a separate explicit security/financial review.

After the verified settings are saved by the authorized GitHub admin, rerun Actions > Global NEO IP NET-003 Read-Only Gateway Inventory from trusted `main` and compare reports. A successful identity handshake is still not proof of active VPN connectivity.

## Cost and safety boundaries

- Operator inspection is read-only; no new fee-bearing compute resources are created by the script.
- No public/private VPN address is issued to outside members.
- Preserve `10.144.0.0/16` and existing project plans; do not register, advertise or claim ownership of external IP space.
- Keep the NET-002 guest/partner firewall template in review until it can be safely staged and acceptance-tested.
