# NEO-CONNECT-002 — Mobile Mesh Activation and Evidence Gate

Date: 2026-11-13
State: STAGING / NO PHYSICAL PEER ATTESTED / NO LIVE VPN OR WAN FAILOVER CLAIM

## Baseline and scope

Reuses services/neo-vpn/ and GLOBAL NEO IP NET-007/008. NEO's proposed service CIDR 10.144.0.0/16 is **not** a NetBird-managed 100.64.0.0/10 overlay IP. Do not advertise the NEO subnet until an approved router exists with firewall controls and proof of custody. The prior Wi-Fi diagnostic (NEO-CONNECT-001, PR #1419) is a separate draft gate. A VPN does not boost Wi-Fi radio coverage.

Goal: connect one NEO-controlled Android client to one independently authorized Linux/desktop peer under the existing no-additional-spend policy, verify a real permitted packet over encrypted peer transport, test default-deny access and revocation, and keep deployment private. **No DNS, production routes, device settings, firewall rules, identity service, NetBird account or purchases are changed by the scripts.**

## Gate 1 — Android operator action (manual)

1. Sign into https://app.netbird.io with an approved identity, enable IdP MFA and confirm that the selected plan has no charge. No setup key or access token belongs in chat or Git.
2. Install the official Android client (https://docs.netbird.io/get-started/install/android). Accept Android's VPN consent, sign in through SSO, and confirm the app's connected state. This proves only *client registration*, not end-to-end peer traffic.
3. Use the native Android application, not an unprivileged Termux service, for the VPN tunnel. Android often permits only one active system VPN service; inspect existing VPN settings before replacement to avoid disrupting other access.

## Gate 2 — Authorized Linux/desktop peer (manual)

1. Choose a controlled endpoint that is turned on and authorized for the pilot. SentinelX's crown-node-001 was offline at the November 13 assessment; an offline node is not an active second peer.
2. Follow the official Linux installer from https://docs.netbird.io/get-started/install/linux. In a local terminal only, run netbird up and authenticate through its approved browser/device flow. Never run on production nodes without operator authorization.
3. After local enrollment, from the repository root run the **read-only** observation:

   node services/neo-vpn/diagnostics/connect-002-preflight.mjs

   It invokes only netbird status --check live, ready, startup and prints only PASS/FAIL/NOT_INSTALLED states, not peer names, public IPs, tokens, logs or raw status. A successful ready check may mean Idle, not a WireGuard handshake. The script cannot configure or authorize a VPN.

## Gate 3 — Network access policy (manual)

1. Keep only trusted administrators during the initial connection test. Establish a narrow pilot allow rule, e.g. Admin Pilot → Test Service TCP 443, then disable the initial Default all-to-all policy *after* verifying that the narrow rule works.
2. Do not invite any guest or institutional partner while broad access persists. Reserve neo-ip-admin-pilot, neo-ip-service-pilot, neo-ip-guests, and neo-ip-partners groups for explicit control.
3. Test an actual permitted HTTPS request between independently enrolled peers, a recent peer handshake, and denied access from an unauthorized guest to admin, finance and bot destinations. Verify network revocation and separately verify application-session revocation. Do not log actual routes, keys, IP addresses, payloads or identities in the public repo.
4. A second device controlled by the same operator may be a personal connectivity demonstration, but it does not meet NET-008's **two distinct authorized operators** institutional acceptance gate.

## Gate 4 — Local, redacted acceptance record (manual evidence; not independent proof)

Create a private local JSON file outside the repository containing only this structure (all default values must remain NOT_TESTED until an actual result is observed):

~~~json
{
  "source": "LOCAL_OPERATOR_SELF_REPORT",
  "observed_at": "2026-11-13T23:00:00Z",
  "checks": {
    "two_independently_controlled_devices": "NOT_TESTED",
    "two_distinct_authorized_operators": "NOT_TESTED",
    "recent_encrypted_peer_handshake": "NOT_TESTED",
    "permitted_test_service_request": "NOT_TESTED",
    "broad_default_allow_disabled": "NOT_TESTED",
    "unauthorized_guest_to_admin_denied": "NOT_TESTED",
    "unauthorized_guest_to_finance_denied": "NOT_TESTED",
    "unauthorized_guest_to_bots_denied": "NOT_TESTED",
    "peer_revocation_blocks_access": "NOT_TESTED",
    "application_session_revocation_verified": "NOT_TESTED"
  }
}
~~~

Change observed_at to the actual UTC observation time and individual results to PASS or FAIL after physically testing them. Then run:

node services/neo-vpn/federation/connect-002-acceptance.mjs --evidence /private/path/observations.json

The evaluator accepts data less than 24 hours old, prints only fixed statuses, never echoes unknown fields and never declares a production VPN, an independently verified result, or the NEO 10.144 route operational. **All PASS → ELIGIBLE_FOR_INDEPENDENT_MANUAL_REVIEW**, not production acceptance. Any missing, failed or untested item yields HOLD.

## Required next evidence

- Physical Wi-Fi assessment from the preceding gate (near router and distant rooms), *without SSIDs or addresses*.
- Android NetBird app connected state recorded locally.
- An available authorized second peer and read-only daemon check; then actual WireGuard handshake and permitted application request.
- Explicit restricted policy, forbidden-path checks, peer revocation and app-session revocation.
- Independent reviewer approval before institutional onboarding.

## Safety and budget

No new cloud resources, personal identity, subscription, credentials, machine, route, firewall or DNS changes are approved. Preserve an out-of-band access path before changing default policies. Do not use a public open proxy or depend on GitHub Pages/Render HTTP web services to act as a WireGuard UDP endpoint. No member access is granted by merging this documentation.

## Tests

node --test services/neo-vpn/tests/connect-002.test.mjs

Passing tests prove only code behavior and redaction, not connectivity. The NEO owner must personally authorize enrollment, VPN consent, external provider terms, and any future deployment.
