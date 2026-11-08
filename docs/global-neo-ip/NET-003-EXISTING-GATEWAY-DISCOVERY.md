# GLOBAL-NEO-IP-NET-003 — Existing Gateway Discovery and First Live Evidence

Status: IMPLEMENTED AS REVIEW-ONLY CHANGE / PRODUCTION NOT CERTIFIED
Date: 2026-11-08
Prior work: draft PR #1366; active issue #1367; existing Gate 114 and NEO VPN Node 001

## Mission

Find out whether NEO VPN Node 001 is already provisioned and safe to use, WITHOUT making assumptions, provisioning duplicate infrastructure, enabling paid services, or exposing VPN credentials.

### Existing evidence

- The source repository has a Gate 114 network-fabric implementation and tests.
- The repository defines `10.144.0.0/16` with `10.144.1.1` gateway and `10.144.10.10/32` proposed first admin peer.
- `services/neo-vpn/infra/gcp/` contains Terraform, startup, OIDC and activation scripts.
- Static firewall/guest policy from NET-002 is in draft PR #1366, not deployed.
- Current GitHub/Render inspection did not establish a live GCP VM, allocated endpoint, authorized peers or recent WireGuard handshakes.

**No test data or provider configuration file counts as proof of a live tunnel.**

## Tooling delivered by NET-003

- `services/neo-vpn/diagnostics/gcp-inventory-report.mjs`: fail-closed classification of Compute instance/address inventory, prints no actual public endpoint, peer key or secret.
- `services/neo-vpn/tests/gcp-inventory-report.test.mjs`: asserts that an apparently running VM plus a reserved public IP still yields `NOT_CERTIFIED`.
- `.github/workflows/global-neo-ip-net-003.yml`: unit tests on pull requests; ONLY a manual dispatch from trusted `main` can query existing Google Cloud with existing `neo-vpn-plan` environment and WIF identity.

### Secure execution after reviewed merge

On GitHub, Actions > **Global NEO IP NET-003 Read-Only Gateway Inventory** > Run workflow, branch `main`. No `apply`, `deploy`, `create`, `patch` or `update` operations exist in this workflow. Do not run under any credential other than the authorized existing workload identity.

The workflow:
1. Requires the existing GCP project, workload identity provider and service account variables.
2. Uses short-lived GitHub OIDC authentication, not a JSON key.
3. Performs LIST-only Google Compute Engine calls for VMs and address reservations.
4. Produces a restricted, sanitized inventory summary in the GitHub job.
5. Leaves WireGuard runtime, provider settings, firewall, DNS and routing untouched.

If authentication fails or permission is missing, output is UNVERIFIED, not ABSENT. If no matching VM is found in the accessible project, confirm whether a different existing authorized project hosts Node 001 before creating any resource.

## Reality-based next step after discovery

A report showing inventory `FOUND` and `RUNNING` still is **not** a live VPN declaration. Obtain authorized host access, and record non-secret evidence:

1. Node 001 exact project/zone and provider-assigned public endpoint from an authorized control panel (do not place the full endpoint in a public issue).
2. `sudo wg show` with peer public-key fingerprints and recent handshake times only; never include private keys.
3. `sudo ip -4 addr show dev wg0`, `sudo systemctl is-active wg-quick@wg0 nftables`, and read-only `sudo nft list ruleset`.
4. Confirm approved firewall design: NET-002 guest/partner access must not inherit broad forwarding. Provide safe console rollback before changes.
5. Two independent approved devices with separate keys and distinct assigned private /32 addresses; prove recent encrypted handshakes, specific allowed HTTPS requests, denied cross-segment attempts.
6. Deny/revoke a peer and confirm access stops; test expiration and application-session revocation. WireGuard alone does not provide credential TTL.
7. Verify reboot recovery, restricted logging, and sign an acceptance report.

## Release decision matrix

| Evidence | Decision |
| --- | --- |
| No authorized provider project or read permission | BLOCKED — inventory unverified |
| Node 001 missing in selected accessible project | HOLD — reconcile existing project/hosts before provisioning |
| Node 001 found but no verified UDP/WireGuard host state | HOLD — host access audit required |
| Working `wg0` but no two independent peers | HOLD — no member onboarding |
| Handshakes succeed but unauthorized routing exists | BLOCKED — fix segmentation and retest |
| Host state, two peers, least privilege, expiration/revocation and reboot all pass | ELIGIBLE FOR EXPLICIT PILOT APPROVAL |

## Budget and decentralization

- No new paid cloud resource, domain, ASN, public IP rental, VPN vendor or managed network is authorized by this gate.
- Maintain portable WireGuard configs and gateway backups; future independent nodes can federate under NEO-owned identity/approval controls.
- Publicly routable IPv6 and ASN acquisition remain a separate budgeted regulatory/provider decision; see NET-002 ARIN assessment.
