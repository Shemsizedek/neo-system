# GLOBAL-NEO-IP-NET-008 — First Two Actual Encrypted Devices

Date: 2026-11-09
Status: CODE READY; PROVIDER ACCOUNT AND DEVICES NOT YET ENROLLED
Baseline: NET-007 provider-neutral policy merged on main, `10.144.0.0/16` canonical NEO subnet; no charge approved.

## Purpose

Move beyond configuration tests. Establish a real two-device encrypted pilot using the NetBird Cloud Free control plane as a replaceable transport. Do not call NEO's private routing, member clearance enforcement, or independently routed public IPv6 live unless proven separately.

Official references:
- [NetBird Cloud free plan (5 users, 100 machines)](https://docs.netbird.io/manage/settings/plans-and-billing)
- [Create account and connect first peers](https://docs.netbird.io/get-started)
- [Android client](https://docs.netbird.io/get-started/install/android)
- [CLI connection and health checks](https://docs.netbird.io/get-started/cli)
- [Zero Trust policies](https://docs.netbird.io/use-cases/security/implement-zero-trust)
- [NetBird management peers API](https://docs.netbird.io/api/resources/peers)
- [NetBird management policies API](https://docs.netbird.io/api/resources/policies)

### 0. No additional cost and control

The user must personally authorize a new NetBird Cloud account and SSO enrollment if an account has not been created. Check `Settings → Plans & Billing`; select the Free plan only. Confirm eligibility, consent, current quota, and payment terms. Do not start an auto-renewing paid subscription or exceed plan quotas. Never share an IdP password or token in GitHub/ChatGPT, and do not create throwaway accounts to evade limits.

Cloud NetBird is an external managed control plane, not an independently NEO-owned server. The long-term roadmap includes NEO-owned/independently operated routing and possibly self-hosted mesh control. The current proof-of-concept intentionally uses a replaceable managed plane.

### 1. Device A — approved NEO administration, Android

1. Access https://app.netbird.io and authenticate using an approved NEO organization identity with MFA. Complete the onboarding only on a no-charge plan.
2. On Android, install the official NetBird app from the Play Store using the link in NetBird's Android installation page. Open it, use NetBird Cloud as the default management server, select Connect, approve Android's VPN request and authenticate with the same approved identity. Do not enter any setup key in chat.
3. Confirm this device shows connected in the app and NetBird dashboard. This proves enrollment/reporting only; an encrypted peer-to-peer session still requires another peer.

### 2. Device B — separately controlled and authorized

Use a separately administered laptop, server or phone. Obtain the operator's explicit consent and approved NEO pilot role. Do not count a second process or cloned key on the same device as an independent operator.

- Desktop: install the official client, launch it and use SSO. Command-line alternative after installation: `netbird up` then `netbird status`.
- On Android: follow the same official application workflow.
- Confirm both unique peers in the NetBird dashboard and distinct authorized operator identities.
- Use a restricted, pilot-only test service between the two devices or the onboarding connectivity check. The dashboard status alone does NOT prove current WireGuard handshake or application reachability.

### 3. Replace broad onboarding access before outside members

The official NetBird quickstart creates a `Default` all-to-all rule. While enrolling two trusted pilot devices, it can help verify baseline connectivity, but it MUST NOT remain enabled when guests or institutional partners are invited.

1. Make explicit groups: `neo-ip-admin-pilot`, `neo-ip-service-pilot`, `neo-ip-guests`, `neo-ip-partners`.
2. Create a specific test rule only from approved admin pilot group to a designated pilot service/peer (e.g. TCP 443 on a test listener). Confirm that this allow rule is effective before disabling Default.
3. Disable/delete Default all-to-all. Check forbidden admin, treasury and AI-bot destinations from a guest device and verify failures. Preserve an independent recovery path; do not lock the operator out.
4. NetBird's peer-to-peer policies, routing Networks policies and application auth are distinct controls. NEO administrative clearance is not a government security clearance.
5. Collect independent tests confirming allow/deny. A management API policy inventory is **not** an enforced-ACL penetration test.

### 4. NEO `10.144.0.0/16` is NOT the NetBird peer address

NetBird Cloud usually provides its own provider overlay address range `100.64.0.0/10`; this is not the NEO-controlled private subnet. Do not tell members they have received `10.144.x.x` simply because NetBird shows Connected.

Before NEO routing:
- Identify and confirm an **actually controlled/operational** network router or service node with a nonconflicting NEO subnet.
- Publish only minimum authorized service routes through NetBird **Networks**, with source-group-specific access rules and deny-by-default. Do not advertise all `10.144.0.0/16` by default.
- Verify firewall enforcement at both routing peer and protected service.
- Confirm an actual permitted packet to a NEO `10.144.x.x` service plus negative attempts and revocation. Until then `NEO_10_144_ROUTE_NOT_ATTESTED` remains true.

### 5. Read-only Cloud inventory from GitHub (optional after enrollment)

NET-008 adds `.github/workflows/global-neo-ip-net-008.yml` to query the **existing account** with NetBird's documented read-only GET API calls:
- `GET https://api.netbird.io/api/peers`
- `GET https://api.netbird.io/api/policies`

The actions use a `NETBIRD_PAT` secret from the **neo-ip-pilot** GitHub environment (or approved repo secret). This can be a NetBird PAT created under an authorized service identity. Where NetBird supports scoped permissions, choose the minimal READ authority. PATs must never be pasted in chats, committed to source, echoed into logs or shared with other systems. If there is no account/PAT, the workflow fails closed.

**Trigger:** GitHub Actions → Global NEO IP NET-008 Read-Only Mesh Pilot → Run workflow on main (not from a pull request). Only the human operator's manual dispatch invokes the Cloud API. Pull requests execute tests with mocked data only.

The redacted summary reports:
- registered peer count and currently connected, recently seen peer count,
- distinct enrolled user identity count (not the actual identities),
- enabled policies and potential Default broad-access finding,
- uncured blockers for actual handshake, independent operator/physical control, guest negative tests, revocation, and NEO private subnet routing.

Even if two peers are registered/connected and Default is disabled, management metadata alone does not certify live encrypted traffic, no unauthorized routes, revocation or production. The observer always reports HOLD until independent physical network acceptance is reviewed.

### 6. Two-device signed acceptance gate

Accept only when all are observed **in reality**, without exposing private keys:

| Test | Real evidence | Pass condition |
|---|---|---|
| A and B independently enrolled | device owners, approvals, timestamps, redacted status | two real devices |
| Transport | NetBird peer detail, recent handshake and actual allowed packet | connected through encrypted tunnel |
| Policy | explicit narrow allow to pilot test service | expected request succeeds |
| Negative ACL | guest→admin, guest→finance, guest→AI-bot, arbitrary lateral | all fail |
| Revocation | remove a pilot device; re-test the same path | former access stops |
| Session expiration | expire/log out the pilot identity; verify peer access and application sessions | previously authorized access stops |
| NEO routing | route to real NEO `10.144` owned resource, plus route ACL | only if actual routing peer exists |
| Failover | approved second transport and recovery testing | NOT required for first mesh proof, mandatory before decentralized redundancy claim |

Record each as PASS / FAIL / NOT_TESTED. Never transform an absent test into PASS.

### 7. Operator approval needed

An account owner must perform NetBird SSO and first mobile VPN authorization. This cannot be simulated by GitHub CI. The second device requires a separately controlled authorized operator. User consent is needed before external user enrollment.

No new spending, host, device account, VPN peer, NetBird PAT, privileged operation, route, IAM permission, or public IPv6/ASN is created by merging this gate.
