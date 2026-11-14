# NEO-MULTICLOUD-003 — Real Peer Evidence / Institutional Acceptance

State: OPERATOR ACTION REQUIRED — NOT A LIVE NETWORK CERTIFICATION
Date: 2026-11-13 America/Chicago
Prior work: NET-007/008, NEO-MULTICLOUD-001 PR #1424, NEO-MULTICLOUD-002 PR #1425.

## Gate purpose

NEO's Android phone passed its local Termux storage and public HTTPS diagnostics. This is not a NetBird connection. The most recent SentinelX read lists zero online hosts, and the original enrolled Crown host remains offline. We therefore cannot run a real remote WireGuard handshake from the available connected host tools.

This gate provides a **local, redacted operator evidence checker** for a voluntary two-device pilot, explicitly distinct from independently reviewed institutional readiness. It has no cloud credentials, public proxy, secrets or side effects. It cannot log in to NetBird, start VPN services or independently inspect a user's Android device.

## Physical sequence (operator-controlled)

1. Open https://app.netbird.io in the operator's approved account. Review current plan terms and enable MFA.
2. Install/open official NetBird on Android: https://docs.netbird.io/get-started/install/android . Use Android's normal VPN permission prompt, check existing VPN conflicts, authenticate and confirm connected status.
3. Install/open official NetBird on a **separate authorized device**: https://docs.netbird.io/get-started/install/linux . A second personally controlled computer can prove a personal two-device pilot, but institutional acceptance requires independently authorized operators.
4. Record NetBird Android and Linux peer-connected states locally. On Linux inspect `netbird status -d`, including the correct peer and a fresh encrypted WireGuard handshake. Raw output may contain endpoint data: do not paste it or publicize device keys.
5. Configure a *temporary, narrowly scoped* peer policy for Android to the authorized Linux test service on TCP port 18443. Remove broad all-to-all network access **before external guests are invited**; preserve rollback control and avoid exposing sensitive services.
6. Run the reviewed short-lived, one-shot probe from NEO-MULTICLOUD-002 on the Linux NetBird address. From Android Termux, request it through the NetBird overlay using the existing runbook NET-015. Preserve only whether the response was correct (PASS/FAIL/NOT_TESTED), not the peer's actual IP or any session token.
7. For institutional acceptance, separately validate: default all-to-all disabled, unauthorized guest access denied to protected destinations, peer revocation, application-session revocation, distinct authorized operators and a real routing host/private resource. Failed connections count as denial only when the service's positive control works.
8. Do **not** advertise NEO 10.144.0.0/16 from the phone or a cloud web service. A NetBird-assigned 100.64/10 peer address does not establish NEO's 10.144 network. Wi-Fi range and independent cellular WAN failover remain separate hardware/transport gates.

## Minimal locally stored evidence (NO real keys or names)

Save the following as `$HOME/neo-multicloud-003-evidence.json` in Termux or a private Linux directory, using actual UTC timestamps for each observation. Keep every field NOT_TESTED until independently observed locally. Use the exact keys:

~~~json
{
  "schema": "neo.multicloud.003.operator-evidence.v1",
  "source": "LOCAL_OPERATOR_ATTESTATION",
  "observations": {
    "android": "2026-11-14T04:30:00Z",
    "linux": "2026-11-14T04:30:00Z",
    "handshake": "2026-11-14T04:30:00Z",
    "private_request": "2026-11-14T04:30:00Z"
  },
  "results": {
    "device_a_authorized": "NOT_TESTED",
    "device_b_authorized": "NOT_TESTED",
    "netbird_android_connected": "NOT_TESTED",
    "netbird_second_peer_connected": "NOT_TESTED",
    "recent_wireguard_handshake_on_second_peer": "NOT_TESTED",
    "private_http_response_from_android": "NOT_TESTED",
    "only_narrow_test_policy_allowed": "NOT_TESTED",
    "default_all_to_all_disabled": "NOT_TESTED",
    "unauthorized_guest_denied": "NOT_TESTED",
    "peer_revocation_denies_private_access": "NOT_TESTED",
    "application_session_revocation_verified": "NOT_TESTED",
    "two_distinct_authorized_operators": "NOT_TESTED",
    "independent_failure_domain_verified": "NOT_TESTED",
    "approved_gateway_host_qualified": "NOT_TESTED",
    "restricted_neo_service_resource_verified": "NOT_TESTED"
  }
}
~~~

**Important:** Timestamps above are placeholders, not observations. Set each timestamp to a true observation time; the checker rejects entries older than 15 minutes, future times beyond 60 seconds, or unrelated handshake/request timestamps. Never change a field to PASS without actual observation. Run the checker immediately after testing.

~~~sh
node services/neo-vpn/federation/multicloud-003-evidence.mjs --evidence "$HOME/neo-multicloud-003-evidence.json"
~~~

The validator only returns counts, fixed flags and status. It never echoes unknown fields, peer addresses, credentials, private keys or raw network logs. The file stays local. Do not commit the evidence file to GitHub.

## Acceptance and status

- `HOLD_PENDING_REAL_PEER_EVIDENCE`: actual approved private tunnel or service evidence missing.
- `PERSONAL_PILOT_REVIEW_ELIGIBLE_NOT_CERTIFIED`: seven pilot questions operator-marked PASS with correlated observations. This is **self-reported**, not independent proof.
- `INSTITUTIONAL_REVIEW_ELIGIBLE_NOT_CERTIFIED`: all pilot and institutional checks operator-marked PASS. Still requires an independent reviewer and signed authorization.
- `HOLD_INVALID_OR_STALE_EVIDENCE`: malformed fields, invalid timestamps, missing statuses or file unreadable.

At every level, the code keeps `actual_wireguard_handshake_independently_verified=false`, `live_neo_private_route_certified=false`, `failover_certified=false`, and `production_authorized=false`.

## First actionable milestone

Provide a real second authorized device—owned computer or approved independently operated peer. Install/authorize NetBird on that device and Android, observe recent handshake, run the private request, then evaluate the local results. No current cloud inventory or successful GitHub CI run substitutes for this.

## Test

`node --test services/neo-vpn/tests/multicloud-003-evidence.test.mjs`

Passing unit tests establish only code validation, not actual private transport.
