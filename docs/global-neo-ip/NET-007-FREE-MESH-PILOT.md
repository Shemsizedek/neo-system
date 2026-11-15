# GLOBAL NEO IP — NET-007 Provider-Neutral Mesh Pilot and Free-Resource Continuity

Date: 2026-11-08
State: REVIEW-ONLY ENGINEERING / NO MESH ACCOUNT CREATED / NO LIVE PEER
Canonical project: NEO Sovereign Network Fabric (Gate 114), NEO VPN, and #1367.
Budget: USD $0 of additional cloud infrastructure approved. Never assume a free trial rolls into a permanent no-charge service.

## Decision: GCP not required

Google Cloud is unavailable as an operational execution path. Remove GCP from the active launch dependencies; retain the earlier read-only GCP diagnostics only for historical recovery. Avoid mutating, redeploying or deleting original GCP resources without ownership/billing evidence.

The initial pilot uses a portable, NAT-friendly encrypted transport, **without a new hosted VPN VM**.

### Verified November 2026 free-platform candidates

1. **NetBird Cloud Free** — first pilot candidate. Official documentation (2026-10-06) lists 5 users, 100 machines, WireGuard encryption, routing, access controls and private DNS: https://docs.netbird.io/manage/settings/plans-and-billing and https://netbird.ai/start. Separate account creation/acceptance is necessary. It is NOT currently connected in ChatGPT, and no user enrollment is proven.
2. **Existing NEO/community-owned Linux node** — long-term preferred independent routing peer, run WireGuard directly or self-host NetBird if requirements are met. Self-host NetBird currently needs a public domain, at least 1 CPU/2 GB RAM and reachable TCP 80/443 plus UDP 3478 (https://docs.netbird.io/selfhosted/selfhosted-quickstart). An owned device can also join NetBird Cloud from behind NAT without being a standalone public VPN gateway. No always-on NEO-controlled machine has yet been verified through the connected tools.
3. **Oracle Cloud Always Free** — backup only when the user confirms ownership, free-eligible quota, available regional VM capacity, acceptable card/account requirements and no chargeable resources. Do not create or upgrade an account automatically. https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

**Not viable for the required always-on WireGuard gateway:** GitHub Pages (static); GitHub Codespaces (temporary developer compute); existing Render Free web services (public HTTP ingress, no dedicated public WireGuard UDP listener, can sleep/restart; see https://render.com/docs/web-services and https://render.com/docs/free).

**Do not automatically substitute Tailscale Personal or ZeroTier Personal for this institutional/business network.** Their no-cost Personal plans are restricted to non-commercial use unless explicit eligibility/program exceptions are documented (https://tailscale.com/pricing and https://www.zerotier.com/pricing/).

## Preserve NEO private addressing

- Canonical NEO VPN resource space: `10.144.0.0/16`.
- Guest pilot reserved: `10.144.50.0/24`; partner pilot reserved: `10.144.60.0/24`.
- NetBird Cloud allocates its *own* WireGuard peer addresses from `100.64.0.0/10`; accounts use a distinct /16. A NetBird `100.x.y.z` peer address is NOT an actual assigned NEO `10.144.x.y` address.
- To access NEO's subnet through NetBird, an **already controlled and actually running** NEO machine/router must own the intended `10.144` network and publish only the approved subnet or service resources via NetBird routing policies. A hosted NetBird account alone cannot manufacture the NEO gateway or activate nonexistent private services.
- Before any routing advertisement, verify subnet ownership, collision avoidance, egress/split tunnel behavior, firewall and L3 source validation; do not route all `10.144.0.0/16` if narrower guest/partner routes suffice.

Source: https://docs.netbird.io/about-netbird/how-netbird-works and https://docs.netbird.io/use-cases/security/implement-zero-trust

## Real first-pilot acceptance, when authorized account and two devices exist

1. An authorized NEO administrator opens https://app.netbird.io and elects the appropriate free plan after reviewing current eligibility/terms. If the plan is unavailable, do NOT select a paid plan, import a payment method, evade limits or rotate new accounts to continue service.
2. Enable MFA on the sign-in identity provider and review NetBird's default access policy. **Remove or restrict broad allow-all policies before enrolling any outside user.** Maintain app-level authentication independently of the mesh.
3. Register first authorized device A, controlled by NEO administrator. Confirm its assigned NetBird peer IP, reported transport state and recent peer network evidence.
4. Register second device B controlled by an **independent authorized operator**, with separate login/device identity and explicit consent. Test encrypted transport between A and B with one specifically permitted service; verify both can be revoked independently.
5. Create separate guest and partner group policies, default deny other device/resource groups; test denied peer-to-admin/finance/bot access. Do not expose internal financial systems.
6. Only when a NEO-controlled routing peer exists, attach a **narrow** approved `10.144.x.x/32` service route (or reviewed /24) and verify path + anti-spoof controls. Mark canonical NEO subnet connectivity **NOT VERIFIED** until tested.
7. Capture **non-secret** evidence: timestamp, device role labels, session/connection type, permitted request, forbidden request 401/403 or timeout, revocation test, DNS/route test and approving administrator. Never post setup keys, private keys, identity tokens, recovery codes or peer endpoint secrets in GitHub.
8. Validate peer removal blocks traffic and application sessions; validate recovery when one provider fails. Set a scoped expiration and evaluate actual revocation automation before inviting guests.
9. Record a signed/operator-approved acceptance gate before allowing institutional partners.

## Provider exhaustion / decentralized continuity

The user requested: **when an eligible free service stops working, move to the next lawful free platform**.

Allowed automatic functions at this gate:
- identify event `provider_unavailable`, `quota_exhausted`, or `gateway_unhealthy` from *real evidence*;
- shortlist next eligible no-cost candidate;
- block a candidate with missing owner permission, cost confirmation, terms compliance, encryption/isolation/revocation proof;
- prepare a non-secret cutover proposal.

Do **not** silently create extra accounts to defeat plan limits, migrate secrets, change BGP, replace DNS, pay for quotas, or assert two peers are connected when they are not.

Once standby platforms have genuinely been enrolled and separately certified, an authorized persistent NEO controller can perform cutover under an approved failover runbook. This module is the **pure decision policy** only, not a daemon.

For any cutover, preserve device identity provenance and enforce fresh authorization. Provider peer IPs may change; avoid treating a provider-selected `100.64/10` address as the stable NEO `10.144/16` identity.

## Immediate evidence still missing

- No NetBird account/plugin currently connected.
- No NetBird peer enrollment completed.
- SentinelX has no connected NEO host; the separate Crown node is offline.
- No NEO WireGuard-hosted gateway is certified.
- No real two-device encrypted handshake, private subnet route or revocation drill is complete.
- No independent public IPv4/IPv6 or ASN allocation is verified.

NET-007 is safe to merge as source and CI validation but **not** a live network launch.
