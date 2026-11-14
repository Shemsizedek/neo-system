# NEO-CONNECT-003 — Controlled Live Handshake, Isolation and Cellular Failover Verification

State: STAGING, NOT DEPLOYED. No two-peer encrypted handshake or independent failover attested.
Date: 2026-11-13. Depends on draft PR #1420, which depends on #1419.

## Why this gate

The NEO VPN's existing `live-acceptance.sh` is for a NEO-controlled WireGuard gateway with `wg0`. It is not a substitute for NetBird's managed overlay on Android. `NET-008` already audits cloud peer/policy metadata. This gate adds **read-only endpoint reachability** and a fail-closed operator evidence rubric without configuring the internet uplink or exposing device details.

The required three phases are:

1. `wifi_baseline` — Android phone or controlled Linux device connected through primary Wi-Fi.
2. `cellular_backup` — the **same observed device** using authorized cellular internet while the separately operated NEO test peer stays reachable; explicitly verify cellular is the actual uplink. Never disconnect a remote gateway, production server or only management route to perform this test. The user switches connections on the phone; this code never does.
3. `wifi_restored` — same device returned to original Wi-Fi and tested again.

If running in Termux, install Node.js locally (`pkg install nodejs`); NetBird's VPN tunnel is run by the **official Android app**, not by an assumed Termux `netbird` daemon. The NetBird CLI readiness field will normally be `NOT_AVAILABLE` in Termux and must not be interpreted as an offline tunnel. If running on Linux, the script checks `netbird status --check startup` (management/signal/relay readiness); this does **not** verify peer WireGuard traffic. Also follow NetBird's official Android and Linux instructions under NET-008.

## Local commands (read-only; save reports outside public repo)

~~~sh
node services/neo-vpn/diagnostics/connect-003-probe.mjs --phase wifi_baseline > "$HOME/neo-connect-wifi.json"
# Operator manually selects cellular on their own phone and confirms internet interface
node services/neo-vpn/diagnostics/connect-003-probe.mjs --phase cellular_backup > "$HOME/neo-connect-cellular.json"
# Operator manually returns to Wi-Fi
node services/neo-vpn/diagnostics/connect-003-probe.mjs --phase wifi_restored > "$HOME/neo-connect-restored.json"
~~~

The probe performs HEAD requests to two fixed public HTTPS test sites (`example.org` and `www.iana.org`) and a single read-only NetBird startup health check. A captive portal or endpoint restrictions may cause false FAIL; test a permitted private application separately. There is no SSID, BSSID, public IP, public key, routing table, token, private key, device identifier or secret in printed summaries. It does not measure latency, loss, speed, signal strength or uninterrupted active session continuity. Do not commit real-device observations into the public repository.

## Actual private connectivity and network isolation (operator action)

- Confirm real NET-008 Android and Linux peers, distinct authorized operators, explicit narrowly-scoped NetBird policy, and Default all-to-all disabled before inviting others.
- Confirm fresh WireGuard handshake in `netbird status --detail` **locally on the Linux device only**; do not paste the full output (it includes public keys and endpoint data) into a public issue or chat.
- From the phone, access an explicitly authorized test HTTPS resource served through the second peer. Check the result both on Wi-Fi and cellular. Check allowed and denied paths, guest→admin/finance/bots failures and peer/app-session revocation, without creating a public open proxy. A `403`, TCP refusal or timeout on a deliberately forbidden path is not proof without proving the test target was independently reachable when permitted.
- Confirm physically different Wi-Fi/cellular upstream connectivity using Android's connection UI and, where supported, operator-owned router WAN telemetry. A phase label or successful public HTTPS alone cannot attest multi-WAN failover or internet bonding.
- Keep a secondary management channel during any user-approved cutover. Never let this script disable the only upstream or change firmware, firewall, DNS, NetBird routes, SIM settings or device VPN permissions.

## Redacted acceptance input

Create an operator-only JSON file outside the repo containing `observations` as an ordered array of the three sanitized probe JSON outputs and `attestations` with all of the following values initially `NOT_TESTED` (change only after actual observations):

- `wifi_to_cellular_switch_observed`
- `cellular_is_separate_working_uplink`
- `return_to_wifi_observed`
- `vpn_peer_reconnected_after_switch`
- `permitted_private_service_works_over_cellular`
- `unauthorized_private_access_blocked_over_cellular`
- `second_authorized_peer_independently_controlled`
- `emergency_rollback_available`

Run `node services/neo-vpn/federation/connect-003-review.mjs --evidence /private/local/evidence.json`. The review validates phases and snapshot chronology, excludes unknown fields, avoids echoing raw evidence, and prints a HOLD unless every HTTPS probe succeeded and every operator attestation is PASS. Even an all-PASS self-report is only `ELIGIBLE_FOR_INDEPENDENT_MANUAL_REVIEW`, never production certification.

## Acceptance conditions and blockers

| Area | Minimum requirement | Current evidence |
| --- | --- | --- |
| Client connectivity | Real Android VPN and authorized second peer | NOT VERIFIED |
| Secure transport | Recent peer handshake plus real private HTTPS request | NOT VERIFIED |
| Segmentation | Narrow allow, guest deny, revocation and independent test | NOT VERIFIED |
| Physical WAN | Authorized Wi-Fi and independent cellular uplinks | NOT VERIFIED |
| Recovery | Successful private request after switching and returning | NOT VERIFIED |
| Route safety | No unauthorized broad `10.144.0.0/16` advertisement | NOT VERIFIED |
| Cost/ownership | No added paid service or production modification | No spending or configuration done by these scripts |

Do not accept live production or institutional partner access until separately verified. NET-008 remains the authoritative managed-mesh enrollment baseline; this gate measures additional device-side evidence. Preserve the `10.144.0.0/16` NEO overlay resource plan without asserting NetBird supplies those addresses.

## Tests

~~~sh
node --test services/neo-vpn/tests/connect-003.test.mjs
~~~

Tests use injected mock network functions; passing tests do **not** represent internet connectivity, verified network change or live VPN handshake.
