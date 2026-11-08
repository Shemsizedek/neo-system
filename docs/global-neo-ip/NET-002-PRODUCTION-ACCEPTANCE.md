# GLOBAL-NEO-IP-NET-002 — Gateway evidence, segregated onboarding and live acceptance

Status: REVIEW-ONLY / NOT ACTIVATED
Date: 2026-11-08
Owner: NEO System / existing Gate 114 Sovereign Network Fabric and NEO VPN
Deployment rule: NO NEW PAID RESOURCE; NO UNREVIEWED FIREWALL REPLACEMENT; NO INVITED PEERS UNTIL A LIVE ACCEPTANCE REPORT.

## Reconciliation with work already completed

Existing source:
- `infra/neo-network/README.md` — Gate 114 service discovery and network control plane, `10.144.0.0/16`, `*.estate.neo`.
- `services/neo-vpn/README.md` — WireGuard segmentation and gateway architecture.
- `services/neo-vpn/infra/gcp/main.tf` / `startup.sh` — proposed GCP Node 001 with reserved public IP and `wg0` address `10.144.1.1/16`.
- `services/neo-vpn/scripts/enroll-peer.sh` and `revoke-peer.sh` — operational host scripts.
- `services/neo-vpn/scripts/live-acceptance.sh` — first-admin acceptance checker.
- `services/neo-vpn/discord/README.md` — separately gated control-plane requests.

Repository code is NOT evidence that an actual VM, a reserved IPv4 address, two independently controlled peers, signed approval records, or working service routing exist. Neither Render workspace inventory displayed a dedicated NEO VPN gateway. Existing GCP runtime, Terraform remote state and host network state require an authenticated read-only check by an authorized operator. Do not deploy duplicates based on an inconclusive inventory.

## 0. Read-only discovery / cost protection

In the already-authorized Google Cloud project, inspect (do not create):
1. Compute instance `neo-vpn-node-001` with actual instance state, zone, project, network, and public IP.
2. Reserved addresses and in-use binding for the NEO gateway; compare with Terraform remote state.
3. GitHub Actions `NEO VPN GCP` plan/apply evidence, approvals, and current configuration.
4. Gateway health: `sudo wg show`, `sudo ip -4 addr show dev wg0`, `sudo nft list ruleset`, `sudo systemctl is-active wg-quick@wg0 nftables`.
5. Security-group / firewall ingress for UDP 51820 and restricted administrator management; inspect endpoint reachability from a distinct approved client network.
6. Existing host billing/entitlement, usage alerts, and recurring charges. Stop on unknown spending.

Never print private keys, paste admin configurations, or post full VPN diagnostics containing sensitive peer information in public logs.

If live acceptance evidence already exists, preserve the original canonical deployment and certify it instead of reprovisioning.

## 1. Addressing and audience segmentation

Retain:
- `10.144.1.0/24`: gateways
- `10.144.10.0/24`: administrators
- `10.144.20.0/24`: protected services
- `10.144.30.0/24`: automation
- `10.144.40.0/24`: development

NET-002 proposes:
- `10.144.50.0/24`: approved guest members
- `10.144.60.0/24`: approved institutional partners

Example only, NOT yet assigned: guest peer `10.144.50.10/32` and partner peer `10.144.60.10/32`. Never give an address to a human before approving the actual device public key and checking duplicate allocation.

Suggested private destinations `10.144.20.10:443` public-information proxy and `10.144.20.20:443` partner proxy are RESERVED EXAMPLES. Verify service ownership, TLS authentication, DNS registration, actual address assignment, and application authorization before installing any firewall that references them.

Network access classes are internal NEO privileges, NOT government-issued security clearances.

## 2. Candidate hardening (not installed)

`services/neo-vpn/nftables/neo-vpn-segmented.review.nft` is a fail-closed REVIEW TEMPLATE, not an active policy:
- default deny on incoming traffic and forwarding;
- guest devices can reach only approved HTTPS public-information proxy;
- partners can reach that proxy plus specifically approved partner HTTPS proxy;
- administrator devices receive HTTPS-only service-zone routing in the template;
- no east-west peer access, broad Internet NAT, or admin access for guests;
- the public HTTPS front door belongs on a separate hardened public ingress;
- cryptokey routing MUST assign each peer a distinct `AllowedIPs=/32` and must reject claimed source-IP spoofing.

The existing general `services/neo-vpn/nftables/neo-vpn.nft` template is MORE PERMISSIVE in forwarding. It must NOT be used as proof of tenant isolation. The GCP `startup.sh` separately blocks `wg0` to `wg0` but does not implement NET-002's member role matrix. Review routing differences before selecting either baseline. Do not blindly install the review template: `flush ruleset` replaces existing rules and could lock out administration.

## 3. Enrollment and expiration

For each device:
1. Validate independent human or organization identity and explicit invitation acceptance.
2. Issue a role, resource-scoped privileges, a fixed expiration date and a documented approving operator.
3. Generate a fresh WireGuard key pair ON THE DEVICE. Only the public key leaves it.
4. Allocate an unused `/32` address from the approved role's subnet.
5. Add the peer public key and `AllowedIPs` in the gateway's approved peer configuration.
6. After the handshake, enforce actual firewall isolation and separate authenticated app access.
7. Maintain a protected peer inventory: device ID, public-key fingerprint, IP, role, approved routes, issuer, approver, expiration, status, last-handshake time, revocation receipt. Log metadata only.
8. Use a durable scheduler/controller to revoke expired invitations and active WireGuard peer configurations; WireGuard peers do NOT expire automatically.
9. Revoking VPN access is not sufficient: revoke application sessions/tokens and access to any shared resources separately.

Do not represent unconnected approval scripts or future schedulers as active automation.

## 4. Two independently controlled device acceptance

A real gate requires TWO devices controlled by distinct operators (or two independently administered endpoints):
- Device A: approved guest peer `10.144.50.10/32` (example).
- Device B: approved partner peer `10.144.60.10/32` (example).
- Gateway: `10.144.1.1` and actual authorized public endpoint.

Evidence set (no secrets):
- Host and provider inventory; reserved IP assignment; UDP 51820 reachability;
- distinct public keys and allowed-source-IP mappings;
- recent `wg show latest-handshakes` results for each device;
- successful encrypted request to the exact permitted target for each role;
- guest-to-partner, guest-to-admin, guest-to-bot, partner-to-admin and lateral peer traffic FAIL;
- deny by default for unassigned/expired/revoked identity;
- guest/partner general Internet egress DENIED unless separately authorized, with no DNS leaks;
- explicit application 401/403 checks for users without service permission;
- peer revocation and expiration removal confirmed after a former active connection;
- fail-closed service restart and reboot persistence;
- narrow host logging, no payloads/secrets, secure evidence reference and timestamps.

Test negative pathways from each device, not just firewall text. Log results as PASS/FAIL/NOT TESTED. An absent test is NOT a pass.

## 5. Public gateway vs private peer access

Public HTTPS may serve non-sensitive pages to anyone, independently of the private overlay. Approved remote devices get private VPN IPs; those addresses are NOT publicly routed IPs. The `estate.neo` suffix is an internal namespace, not proof of an Internet-wide DNS delegation.

## 6. Release gates

- NET-002A: verify existing cloud resources and no-new-spend baseline.
- NET-002B: lint and review isolated firewall; verify fallback console and rollback; capture real `nft -c` check.
- NET-002C: two distinct approved peers with successful encrypted handshakes.
- NET-002D: positive and negative routed connectivity tests.
- NET-002E: protected audit record, expiry scheduler and revocation drill.
- NET-002F: invite pilot members ONLY after gateway and app-layer authorization pass.
- NET-002G: publish signed operator acceptance and promote changes through an approved maintenance window.

No existing production network or user permission is changed by this review branch.
