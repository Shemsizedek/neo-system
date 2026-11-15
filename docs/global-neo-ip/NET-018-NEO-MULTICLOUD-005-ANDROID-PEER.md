# NEO-MULTICLOUD-005 — Android VPN Connected, First Peer Transaction Gate

State: ANDROID VPN APP CONNECTED BY SCREENSHOT / SECOND PEER NOT VERIFIED
Evidence date: 2026-11-14, America/Chicago
Depends: NET-015 temporary peer HTTP responder, NET-016 peer evidence, NET-017 Linux local handshake observer.
Work location: append to existing multi-cloud PR #1426; no new production rollout.

## New first-hand evidence (private screenshot, sanitized summary only)

The operator supplied a screenshot of the **official NetBird Android application**, showing:
- orange VPN switch on and the literal **Connected** label;
- the green indicator and selected network `default`;
- an assigned NetBird overlay IPv4 address in the `100.64.0.0/10` range, prefix /16 (specific IP and device name deliberately not reproduced);
- Android's VPN key glyph in the status bar;
- a **session expires in 1 day** notice;
- Exit node: **No exit nodes available**.

Classification: USER_SUPPLIED_SCREENSHOT / ANDROID_CLIENT_CONNECTED. The screenshot is evidence of the Android app's reported connected state at the moment displayed. It is not a control-plane inventory, proof of a second peer, proof of policy isolation, or independent WireGuard traffic observation. Do not infer that Android is sending general internet traffic through NetBird when no exit node is selected.

No NetBird API connection is available through the currently connected ChatGPT actions. A separate platform plugin search did not return a usable NetBird peer-inventory connector. Do not request API tokens in chat and do not commit the screenshot/peer identifiers to the public repo.

## Check access security first

The `default` at the top of the Android app is a selected network label, **not proof that NetBird's Default all-to-all policy is enabled**. In the NetBird web dashboard, inspect **Access Control > Policies**. A newly created account may have a permissive Default policy allowing All → All and all ports/protocols; no external guests or partners should be enrolled on this assumption. Create/test a narrow rule for the two authorized pilot peers before retiring a permissive Default policy, avoiding accidental lockout. Keep NEO finance/admin resources excluded.

NetBird interactive SSO peer expiration is normally 24 hours by default, and the screenshot actually shows a one-day expiry; use the in-app session extension prompt with normal authentication when necessary. Do not automatically disable expiry in the name of better connectivity.

## Minimal next live procedure

**Step A: Android peer inventory**
Open the **Peers** tab visible at the bottom of the NetBird Android application and check whether at least one OTHER peer appears as **Connected**. The present screenshot does not show the contents of Peers, so count remains **UNKNOWN**. If no second peer is connected, stop; the Android app's own Connected status is insufficient for a private transaction.

**Step B: Authorized second device**
On a trusted and authorized Linux device, open official NetBird client and join the same approved network through authorized SSO. A personal device can establish a personal smoke test; institutional certification needs distinct operators and documented permissions. Do not assume `crown-node-001` is available: last SentinelX inventory has 0 connected hosts. Neither Render HTTP apps nor temporary CI runners are accepted permanent UDP gateways.

**Step C: Private peer test**
On Linux, review and run the one-shot private responder from NET-015 using its NetBird interface IP and explicitly allowed Android peer IP:

    node services/neo-vpn/diagnostics/multicloud-002-private-probe.mjs --listen-ip LINUX_NETBIRD_IP --allow-peer ANDROID_NETBIRD_IP

Use real addresses locally only; do not post them, setup keys, private endpoints or full NetBird status in GitHub. NetBird access policy must permit Android → Linux TCP/18443 for this test.

On Android Termux download the approved client script from the reviewed branch, then run:

    node services/neo-vpn/diagnostics/multicloud-005-android-transaction.mjs --peer-ip LINUX_NETBIRD_IP

This program performs precisely **one HTTP GET** to the known one-shot service on TCP/18443 at the fixed path /neo-private-probe. It permits only a strict NetBird overlay IPv4 destination, follows no redirects, times out, emits no actual addresses, and validates the exact fixed JSON response.

Because the server accepts one request then closes, additional phase tests need an explicit operator **restart of the short-lived responder** for each phase. An access-path phase label only records what the human selected; it is not a measurement of whether the device actually switched from Wi-Fi to cellular.

If the request succeeds, the program emits `PRIVATE_APPLICATION_RESPONSE_OBSERVED` with `wireguard_handshake_independently_verified=false`. A private HTTP response cannot itself prove encryption: separately run the Linux read-only peer observer from NET-017:

    node services/neo-vpn/diagnostics/multicloud-004-peer-observe.mjs --peer-ip ANDROID_NETBIRD_IP

The handshake must be recent on the **same exact** authorized Android peer. Full NetBird CLI output stays on the trusted Linux machine.

**Step D: Network isolation and recovery**
After the positive peer request and narrow policy are verified, review Default all-to-all policy and perform a carefully approved unauthorized peer denial and revocation test. Preserve administrative access. Test cellular/manual Wi-Fi switching only after peer access works; the operator physically changes the phone's uplink and restarts the test responder for a fresh application check. Observe transport and application separately, and do not assert automatic failover or bandwidth bonding from manual tests.

## Audit states

| State | Evidence |
| --- | --- |
| Android NetBird client running | SCREENSHOT_CONNECTED |
| Phone overlay address assigned | SCREENSHOT_REDACTED |
| Number of other connected peers | UNKNOWN |
| Android ↔ second-device handshake | NOT_OBSERVED |
| Private application transaction | NOT_EXECUTED |
| Default all-to-all policy disabled | NOT_VERIFIED |
| Guest ACL denied | NOT_TESTED |
| Application/peer revocation | NOT_TESTED |
| Wi-Fi → cellular private request | NOT_TESTED |
| NEO private network 10.144 route | NOT_CONFIGURED |
| Automatic connection failover | NOT_VERIFIED |

Decision: MOBILE_PEER_CONNECTED / HOLD_SECOND_PEER_AND_PRIVATE_TRANSACTION. **No automatic deployment, new cloud tenancy, new paid capacity, device reconfiguration, or public proxy.**

## Verification

Run locally or in CI:

    node --test services/neo-vpn/tests/multicloud-005-android-transaction.test.mjs

Source:
- https://docs.netbird.io/manage/settings/enforce-periodic-user-authentication
- https://docs.netbird.io/manage/access-control/manage-network-access
- https://docs.netbird.io/help/troubleshooting-resource-connectivity
