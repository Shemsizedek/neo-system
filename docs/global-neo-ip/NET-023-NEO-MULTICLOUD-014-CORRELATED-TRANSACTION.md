# NEO-MULTICLOUD-014 — Correlated private transaction and access-denial gate

Status: STAGED, PRIVATE APPLICATION EXCHANGE NOT EXECUTED
Date: 2026-11-15 America/Chicago
Owner: NEO-CONNECT / NEO-MULTICLOUD
PR: https://github.com/Shemsizedek/neo-system/pull/1426

## Why this gate

The earlier NEO-MULTICLOUD-009 rootless Codespaces test responder returned a **fixed** JSON success marker. A fixed response does not bind a reported HTTP success to the *current* test and could be replayed by another service.

The new rootless service generates a fresh 128-bit hexadecimal nonce from Node.js cryptographic randomness at startup. The nonce is **test correlation data, not an authentication token or setup key**. It is included in the temporary service response and displayed as `NON_SECRET_TEST_CHALLENGE` only to the operator. The Android NEO-MULTICLOUD-014 client refuses missing, stale, malformed, mismatched or static legacy responses.

Both scripts retain fixed NetBird 100.64.0.0/10 destination restrictions and fixed TCP 18443 /neo-private-probe, do not follow redirects, and never promote application success into WireGuard or production authorization.

## Prerequisites (do not skip)

- The Android app is connected to the NetBird network by earlier user screenshot.
- A **real rootless Codespaces NetBird peer** is enrolled and available in the phone's NetBird Peers view; this has NOT been independently observed in this chat.
- In the real Codespaces terminal, the NEO-MULTICLOUD-013 local read-only peer checker reports a **recent handshake for the exact Android peer**. This has NOT been independently observed.
- NetBird access policy is reviewed for Android pilot group → temporary Codespaces pilot group on TCP/18443. A Default All-to-All policy, if active, overrides the isolation objective; do not report access denial until broad permissions have been replaced with reviewed, specific rules and independently tested.
- No third unauthorised test peer has been supplied, so an actual negative access test is still pending. Do not fabricate one from a local timeout or a disconnected peer.

Official NetBird policy documentation: https://docs.netbird.io/manage/access-control/manage-network-access (November 12, 2026).
Official rootless Docker instructions: https://docs.netbird.io/get-started/install/docker .

## Run a correlated private application exchange

1. Codespaces operator checks actual temporary peer readiness:

       bash "$HOME/neo-rootless-pilot.sh" status

   If this fails, stop and diagnose the specific HOLD state. Do not create new cloud services or bypass denied container privileges.

2. Codespaces operator re-downloads/reviews the updated, **120-second** private service launcher into the existing path:

       curl -fsSL 'https://raw.githubusercontent.com/Shemsizedek/neo-system/feat/neo-multicloud-003-peer-evidence/services/neo-vpn/diagnostics/multicloud-009-rootless-service.sh' -o "$HOME/neo-private-service.sh"
       bash -n "$HOME/neo-private-service.sh"
       bash "$HOME/neo-private-service.sh" serve

   At the authorization prompt type POLICY_REVIEWED only if the narrow NetBird allow rule is actually reviewed. The launcher refuses a privileged/root Docker container, published ports, host networking and added capabilities. The response includes a fresh challenge and the terminal displays:

       LOCAL_CONTAINER_TEST_RESPONSE_OK_ANDROID_REQUEST_AND_HANDSHAKE_NOT_VERIFIED
       NON_SECRET_TEST_CHALLENGE=32_lowercase_hex_characters

3. From Android Termux, download both adjacent modules because the challenge client imports the existing IP/port definitions:

       mkdir -p "$HOME/neo-mc014"
       BASE='https://raw.githubusercontent.com/Shemsizedek/neo-system/feat/neo-multicloud-003-peer-evidence/services/neo-vpn/diagnostics'
       curl -fsSL "$BASE/multicloud-014-challenge-client.mjs" -o "$HOME/neo-mc014/multicloud-014-challenge-client.mjs"
       curl -fsSL "$BASE/multicloud-005-android-transaction.mjs" -o "$HOME/neo-mc014/multicloud-005-android-transaction.mjs"

4. Within the service's 120-second lifetime, run the client from Android Termux, replacing **both placeholders locally**:

       node "$HOME/neo-mc014/multicloud-014-challenge-client.mjs" --peer-ip CODESPACE_NETBIRD_IP --expected-challenge NON_SECRET_TEST_CHALLENGE

   If successful, the JSON includes `application_result: CHALLENGE_CORRELATED_PRIVATE_HTTP_RESPONSE` and `unique_current_test_response_correlated: true`. This is an operator-observed, current application response. It is not evidence of independent third-party review or sufficient proof of peer isolation.

   Never paste device-specific IPs, setup keys, public keys, raw NetBird status or screenshots exposing private information into public GitHub PRs.

5. Correlate the request's UTC timestamp to the **same exact** Android peer's recent WireGuard handshake using NEO-MULTICLOUD-013 locally. If the session is relayed, record that accurately; do not mislabel it direct/P2P.

## Mandatory separate negative test

After the positive request, independently inspect the real NetBird policy and effective peer access. On a **separately authorized third test peer** that is intentionally outside the Android pilot source group, attempt the same fixed test URL while the responder is active. The expected negative result is a denied connection, confirmed against the reviewed policy. This step requires an actual third peer and explicit owner approval; the script does not create it.

A timeout, offline device, expired responder, incorrect IP or missing route must **never** be counted as proof of ACL denial. For access acceptance also test revocation of a pilot peer and verify that a previously functioning private request is subsequently refused. Preserve administrative control and recovery access.

Keep raw credentials and network state local. Only record sanitized PASS/FAIL/NOT_TESTED, UTC dates, and the reviewer identity in a private evidence ledger.

## Acceptance matrix

| Criterion | Code status | Live evidence |
| --- | --- | --- |
| Fresh-response correlation | Staged and tested in CI | NOT EXECUTED |
| Android phone NetBird Connected | Screenshot-backed | EARLIER DEVICE OBSERVATION |
| Codespace rootless peer enrolled | Bootstrap staged | NOT VERIFIED |
| Same-peer recent WireGuard handshake | Redacted observer staged | NOT VERIFIED |
| Android correlated application response | Client + server staged | NOT VERIFIED |
| Default all-to-all policy removed/disabled | No changes authorized | NOT VERIFIED |
| Unauthorized third peer denied | Plan only | NOT TESTED |
| Revocation denial | Plan only | NOT TESTED |
| Gateway, private 10.144 routes, WAN failover | Not authorized | NOT CERTIFIED |

## Cleanup and next evidence

After testing: `bash "$HOME/neo-rootless-pilot.sh" stop`, confirm the ephemeral NetBird peer is removed, and stop the Codespace if no longer needed to avoid metered usage.

Do not merge or deploy this staging PR automatically. The software gate can pass CI; **live NEO-MULTICLOUD-014 acceptance is still on hold until real peer and application evidence is supplied**.
