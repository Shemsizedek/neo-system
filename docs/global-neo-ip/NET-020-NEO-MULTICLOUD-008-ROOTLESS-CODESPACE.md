# NEO-MULTICLOUD-008 — Enroll a Temporary Rootless NetBird Peer in the Existing Codespace

State: STAGED OPERATOR LAUNCHER / NOT CONNECTED OR RUN ON USER'S CODESPACE
Date: 2026-11-14 America/Chicago
Depends: NET-019 preflight; NET-015/017/018 later private-service/handshake checks.

## Evidence

The user provided a screenshot from an **active GitHub Codespace** showing a successful local Node.js 24.22.2 diagnostic with:
- GitHub Codespaces environment detected.
- Linux, accessible TUN and Docker daemon available.
- Process does NOT have CAP_NET_ADMIN.
- No NetBird CLI installed.
- Read-only preflight classification: ROOTLESS_DOCKER_PILOT_CANDIDATE_NEEDS_MANUAL_INBOUND_TEST.

This is sufficient to attempt a **rootless temporary client** as an operator-run pilot, NOT to state a WireGuard connection or persistent gateway exists. The prior Android screenshot showed NetBird Connected with a 100.64/10 IP, but the Android Peers tab showed no permitted other machines. The existing SentinelX Crown node remained offline on the most recent check.

## Why rootless

Official NetBird Docker instructions: https://docs.netbird.io/get-started/install/docker

The official netbirdio/netbird:rootless-latest image runs the encrypted client in a gVisor userspace stack without NET_ADMIN. **Its limitation is inbound service access or routing mode; normal outbound access from the container is limited without a SOCKS proxy.** It does not automatically grant a public exit node, amplify Wi-Fi, tunnel the Codespace host's traffic or expose a host service.

Never run privileged Docker or add host capabilities to bypass the Codespace's restrictions. No Render/production service restart or DNS change is needed.

## Step 1 — NetBird dashboard (operator UI, not ChatGPT)

Open https://app.netbird.io/settings/setup-keys in the authorized NetBird account used by the Android app. Create a **One-off** setup key with **Ephemeral Peers enabled**, limited expiry, and a minimal pilot group. If available, choose a purpose-specific pilot group that permits only the Android operator to connect to this test peer; do NOT invite guests, attach finance/admin resources, or assume an all-to-all Default policy is safe. Official setup key guidance: https://docs.netbird.io/manage/peers/register-machines-using-setup-keys

Keep the key completely private. **Do not paste it into GitHub Copilot chat, ChatGPT, terminal commands, a screenshot, or GitHub files.** It will be read using hidden terminal input by the reviewed script. A one-off key minimizes reuse, but Docker administrators can inspect the setup key in the running container environment. After testing, stop the pilot, remove the state volume, and verify the ephemeral peer is removed. Revoking the setup key does not remove already-enrolled peers.

## Step 2 — Existing Codespaces terminal

Open Terminal → New Terminal in the already-running GitHub Codespace (NOT the AI Copilot chat). Review the code before running it:

    curl -fsSL 'https://raw.githubusercontent.com/Shemsizedek/neo-system/feat/neo-multicloud-003-peer-evidence/services/neo-vpn/diagnostics/multicloud-008-rootless-codespace.sh' -o "$HOME/neo-rootless-pilot.sh"
    sed -n '1,180p' "$HOME/neo-rootless-pilot.sh"
    bash -n "$HOME/neo-rootless-pilot.sh"

After confirming current Codespaces usage remains within the account/team free allowance and pilot authorization, invoke:

    bash "$HOME/neo-rootless-pilot.sh" start

The script checks Codespaces and Docker, refuses active CI, avoids reusing any previous pilot state, and prompts for a one-time NetBird key without displaying typed characters. It starts the official rootless container **without privileged mode, NET_ADMIN, host networking, published ports, always-on restarts or production services**. NetBird peer enrollment occurs from the authorized Codespace to the existing account. This is an external registration event performed only when the operator explicitly runs the command.

Run the redacted local readiness check:

    bash "$HOME/neo-rootless-pilot.sh" status

A result of PILOT_NETBIRD_DAEMON_READY_CHECK_ANDROID_PEERS means the daemon is in an acceptable state; it **does not prove a second peer handshake, private service or inbound traffic**. If registration fails, stop and inspect the environment locally; never paste raw Docker inspect/log output with environment secrets into chat.

## Step 3 — First real network observation

1. Return to NetBird Android → **Peers**. Look for an authorized Codespace test peer. If not visible, verify it is registered and approved in NetBird web dashboard → Peers, then review the narrow peer access control policy. Android and the Codespace must be in the same NetBird network.
2. The next gate is a **fresh WireGuard handshake** and an **actual Android → Codespace private application response**, not merely dashboard registration. NetBird's rootless Docker mode uses its own userspace network stack, **so the earlier host-interface-bound one-shot Node responder from NET-015 cannot be assumed to work unchanged**. A separate rootless-compatible service/container-network test must be validated before running the Termux private HTTP client.
3. Do not claim NEO 10.144.0.0/16 private resource routing, guest segregation, redundancy, bandwidth bonding or cellular last-mile failover from this temporary second peer.

## Step 4 — Cleanup after test

Run on the **same** Codespaces terminal:

    bash "$HOME/neo-rootless-pilot.sh" stop

This stops only neo-cs-netbird-pilot and removes its dedicated neo_cs_netbird_pilot_state Docker volume, deleting temporary NetBird state from the Codespace. Confirm the ephemeral peer disappears from NetBird after offline grace; if it persists or should be revoked immediately, remove it explicitly from the NetBird Dashboard. Do not delete other Codespaces, Docker volumes or the enrolled Crown node.

## Acceptance

- User's Android NetBird: CONNECTED, screenshot observed.
- Codespaces Linux + Docker: AVAILABLE, user screenshot observed.
- Rootless pilot code: STAGED, unit/static checks await CI.
- Rootless container started by operator: NOT VERIFIED.
- Codespace peer registered in NetBird: NOT VERIFIED.
- Private peer WireGuard handshake: NOT VERIFIED.
- Private application request: NOT VERIFIED.
- Persistent gateway: NOT VERIFIED (Codespace is disposable, metered).
- Public Wi-Fi coverage or independent cellular failover: NOT IMPROVED OR TESTED.
- Production route and paid capacity: NOT CHANGED.

### Code and test

    node --test services/neo-vpn/tests/multicloud-008-rootless-codespace.test.mjs

These tests validate shell syntax and security invariants only; a real container launch requires the Codespaces owner.
