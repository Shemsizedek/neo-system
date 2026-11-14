# NEO-MULTICLOUD-009 — First Android-to-Codespaces Private Application Transaction

Status: CODE STAGED / REAL SERVICE NOT RUN / SECOND PEER NOT VERIFIED
Date: 2026-11-14 America/Chicago
Depends on NET-020 (rootless NetBird enrollment), NET-018 (Android client), NET-017 (peer handshake).

## Why a separate rootless service is required

The user previously provided an Android NetBird Connected screenshot and a Codespaces screenshot reporting accessible Docker and TUN but no CAP_NET_ADMIN. The NEO-MULTICLOUD-008 rootless NetBird image is a suitable candidate for a temporary second peer. Neither screenshot proves successful container enrollment or any second-peer traffic.

NET-015's ordinary Linux host-interface-bound one-shot Node responder does not automatically work with a Docker rootless NetBird userspace network stack. The official rootless Dockerfile sets NB_USE_NETSTACK_MODE and NB_ENABLE_NETSTACK_LOCAL_FORWARDING to true. A userspace packet filter may deliver permitted traffic to a local service in the SAME CONTAINER, but a real Android request is still required to verify that actual route. The image is Alpine-based and includes BusyBox, so we can attempt a minimal static service without adding Node.js to that container.

Official docs:
- https://docs.netbird.io/get-started/install/docker
- https://docs.netbird.io/client/environment-variables
- https://github.com/netbirdio/netbird/blob/main/client/Dockerfile-rootless

No Codespaces public port forward is required or authorized; Docker does NOT publish TCP/18443 to the host. NetBird network policy must be restricted to the authorized Android test peer, not broad All → All.

## Operator step 1 — check actual rootless peer enrollment

In the existing NEO Codespace **terminal** (NOT the Copilot chat), if the prior NET-020 bootstrap was not performed, first download/review and invoke its start flow. It prompts locally for a **one-off, ephemeral setup key**; NEVER paste the key into ChatGPT, Copilot, PRs, logs or shell command line.

If already downloaded, run:

    bash "$HOME/neo-rootless-pilot.sh" status

Success means the container's NetBird daemon is ready; it does NOT guarantee the Android peer is connected.

Then inspect Android NetBird → Peers and NetBird Dashboard → Peers. Confirm the temporary Codespace peer belongs to the same approved account, and locate its NetBird overlay IP **locally**. Do not publish device names, keys, IPs or raw logs in a public PR.

## Operator step 2 — check policy before allowing inbound traffic

In NetBird Dashboard → Access Control → Policies, verify an explicit narrow, approved peer-to-peer rule permits ONLY your Android pilot group to reach this temporary Codespace pilot group on TCP/18443. Do not invite external users or include NEO admin/finance resources. Default all-to-all policy posture is currently UNKNOWN. If a broad Default rule exists, plan safe replacement and confirm no risk of lockout before changing it. No access policy is modified automatically by this script.

Only after review, proceed to launch a short-lived test responder:

    curl -fsSL 'https://raw.githubusercontent.com/Shemsizedek/neo-system/feat/neo-multicloud-003-peer-evidence/services/neo-vpn/diagnostics/multicloud-009-rootless-service.sh' -o "$HOME/neo-private-service.sh"
    sed -n '1,220p' "$HOME/neo-private-service.sh"
    bash -n "$HOME/neo-private-service.sh"
    bash "$HOME/neo-private-service.sh" serve

The command runs only on a verified interactive Codespaces instance with the exact preexisting rootless pilot container and a non-root container user. It prompts the operator to type POLICY_REVIEWED locally. It then creates a **fixed, non-secret JSON file** and runs BusyBox HTTP within the container on 0.0.0.0:18443 for no more than 120 seconds. 0.0.0.0 here is the container-internal listening address, NOT a public Codespaces port; the script never uses docker -p/--publish, host networking, NET_ADMIN, sudo, firewall rules or DNS changes.

Success:
`LOCAL_CONTAINER_TEST_RESPONSE_OK_ANDROID_REQUEST_AND_HANDSHAKE_NOT_VERIFIED`.
This verifies a local HTTP response inside the container ONLY. It never certifies remote reachability, VPN encryption, internet failover, or a gateway.

If the fixture already exists, the script refuses to overwrite it. For another pilot attempt, finish the current test and stop/clean the rootless pilot per NET-020, then re-enroll with a new appropriately scoped one-off key if approved.

## Operator step 3 — actual Android private request (within 120 seconds)

With Android NetBird app connected, in Android Termux:

    node "$HOME/neo-private-test.mjs" --peer-ip CODESPACE_NETBIRD_IPV4

The NEO-MULTICLOUD-005 client is already prepared in draft PR #1426; if it has not been downloaded on Android, follow NET-018. Replace the placeholder locally with the Codespace's assigned provider overlay IP.

Expected success indicator: `PRIVATE_APPLICATION_RESPONSE_OBSERVED`. A timeout, 404, no peer, or missing NetBird ACL is a HOLD and must never be converted to success or “fixed” by opening a public Codespaces web port.

This responder is **time-bounded but not single-use**; unlike NET-015's one-shot Node server it can answer multiple requests within its 120-second window. Its content is fixed and carries no actual evidence or credentials. A local Docker HTTP success is not evidence of Android-to-Codespaces reachability.

## Operator step 4 — verify transport separately

Inspect the specific Android peer in NetBird **inside the rootless container** or in the authorized control panel, preserving raw details locally:

    docker exec neo-cs-netbird-pilot netbird status --detail

Compare the peer status, connection type (direct/relayed) and fresh WireGuard handshake with the Android request time. This output can contain device addresses and keys; **do not paste raw output into public issues or chat**. Use existing NEO-MULTICLOUD-004 redacted Linux observer only where its CLI format is compatible with the rootless container, or manually record redacted PASS/FAIL/NOT_TESTED evidence in NET-016.

A fully accepted pilot requires: authorized second device, permitted private request, recent same-peer handshake, narrowly scoped policy, and follow-up isolation/revocation tests. This step is NOT institutional certification, automatic Wi-Fi/cellular failover, private gateway provisioning, or activation of NEO 10.144.0.0/16.

## Cleanup

In the same Codespaces terminal after the test:

    bash "$HOME/neo-rootless-pilot.sh" stop

This stops only the named pilot container and deletes the dedicated test identity volume. Verify ephemeral peer cleanup in NetBird's dashboard. Stopping the Codespace itself when the trial is complete conserves quota. Note that GitHub Codespaces is an ephemeral, metered developer machine (default idle stop 30 minutes; maximum 12-hour runtime): https://docs.github.com/en/codespaces/about-codespaces/understanding-the-codespace-lifecycle .

## Evidence status at authoring

| Criterion | State |
| --- | --- |
| Android NetBird app reported Connected | USER_SCREENSHOT_VERIFIED |
| Existing Codespaces has Docker and lacks NET_ADMIN | USER_SCREENSHOT_VERIFIED |
| Rootless bootstrap script verified via CI | CODE_TESTED, no live enrollment observed |
| Rootless NetBird peer listed in Android Peers | UNKNOWN |
| Rootless container HTTP service started | NOT OBSERVED |
| Android Termux private application reply | NOT OBSERVED |
| Same-peer recent WireGuard handshake | NOT OBSERVED |
| Guest isolation and revocation | NOT OBSERVED |
| Cellular failover and permanent gateway | NOT CONFIGURED |

Decision: **HOLD_SECOND_PEER_ENROLLMENT_AND_REAL_PRIVATE_REQUEST**.
No cloud deployment, firewall, DNS, key or route has been modified by the authoring agent.
