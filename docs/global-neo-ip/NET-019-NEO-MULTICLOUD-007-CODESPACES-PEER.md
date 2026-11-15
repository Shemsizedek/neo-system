# NEO-MULTICLOUD-007 — Reuse GitHub Codespaces / Codex Linux for First Temporary Peer

Status: PRE-FLIGHT IMPLEMENTED; ACTUAL CODESPACE OR CODEX LINUX ACCESS NOT VERIFIED.
Date: 2026-11-14 America/Chicago.
Depends: NEO-MULTICLOUD-002 private test server, 004 Linux peer observer, 005 Android private request client, and the already connected Android NetBird app.
Budget policy: no newly approved paid compute, no trial auto-conversion and no account rotation.

## Decision and existing evidence

**First target: GitHub Codespaces in Shemsizedek/neo-system.** The repository already contains a native devcontainer configuration, .devcontainer/devcontainer.json, based on Ubuntu 24.04 with Docker-in-Docker feature. It is currently labeled NEO Mail / SentinelX Lab, so do not edit or rebuild it just to add VPN services and do not change mail service exposure or published ports. A codespace is a short-lived dev/test resource; it is NOT a permanent NEO gateway.

**Second target: actual user-controlled Codex/Ubuntu Linux**, but only after the same read-only preflight is run in that actual shell. ChatGPT's own short-lived local compute container, an AI model endpoint or another person's runner is not a user-owned persistent VPN machine by default. Do not confuse access to the Codex app with access to its underlying host as a routable network peer.

**NEO SYSTEM Render team workspace:** Existing service inventory contains primarily HTTPS web services and static sites. A free Render web service is not a permanent publicly listening WireGuard UDP VM; do not redeploy, unsuspend, change start commands or install a VPN into a production app to make a peer appear. Keep those services available for a separately approved, read-only operations dashboard.

## Verified external constraints

GitHub Codespaces default idle timeout is 30 minutes and maximum lifetime is 12 hours, including active sessions; cannot qualify as an always-on gateway. Personal accounts may have included usage; organization/team-owned Codespaces do not have that same personal free entitlement and may bill the organization. Before creating or starting, the human operator checks current Codespaces billing and remaining allowance. No new Codespace was created using these tools.

NetBird's official Linux CLI supports an SSO-based `netbird up` and `netbird up --foreground-mode` as an alternative to the system daemon. The latter can operate without a conventional systemd service but **does not remove kernel/device/firewall permission requirements**. NetBird Docker also has a rootless userspace image, which can support inbound access without privileged TUN; it is not equivalent to ordinary host networking, does not automatically expose a Node service on the host and does not provide normal outbound peer connectivity without SOCKS. Both branches require a real operator-run compatibility test.

Sources:
- https://docs.github.com/en/codespaces/about-codespaces/understanding-the-codespace-lifecycle
- https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-included-usage
- https://docs.netbird.io/get-started/cli
- https://docs.netbird.io/get-started/install/linux
- https://docs.netbird.io/get-started/install/docker

## Procedure: Codespaces first

1. From a trusted GitHub session open https://github.com/codespaces . Resume an existing Codespace for Shemsizedek/neo-system when possible. If none exists, use a new minimal Codespace only after checking that this account/organization has an included allowance and a hard stop-spend limit. Do not create paid machine sizes or rebuild existing active NEO Mail services.
2. In its terminal, inspect the read-only script from the draft feature branch before running it:

       curl -fsSL https://raw.githubusercontent.com/Shemsizedek/neo-system/feat/neo-multicloud-003-peer-evidence/services/neo-vpn/diagnostics/multicloud-007-compute-preflight.mjs -o "$HOME/neo-multicloud-007.mjs"
       sed -n '1,200p' "$HOME/neo-multicloud-007.mjs"
       node "$HOME/neo-multicloud-007.mjs"

   This checks only the local OS type, Docker daemon availability, existence/accessibility of /dev/net/tun, process CAP_NET_ADMIN and NetBird CLI presence. It runs only docker info and netbird version and never displays their raw output, device identifiers, IP addresses or environment secrets. It does not attempt any VPN connection or privileged operation.

3. Interpret the redacted decision:
   - KERNEL_TUN_PILOT_CANDIDATE_NEEDS_MANUAL_NETBIRD_TEST: the device and process capability look viable, but installation, actual interface creation, SSO and traffic remain unproven. After inspecting the official installer and retaining Codespaces rollback/management access, an authorized operator may install the NetBird Linux CLI and run `sudo netbird up --foreground-mode` through the official SSO flow, in a disposable testing session. Do not enable an exit node, change default routes, advertise NEO subnets, modify public ports or make a persistent agent.
   - ROOTLESS_DOCKER_PILOT_CANDIDATE_NEEDS_MANUAL_INBOUND_TEST: Docker is available but the standard TUN path is not proven. NetBird's official `netbirdio/netbird:rootless-latest` image is a potential inbound-only fallback. Its container namespace and temporary test service must be connected and negative access controls independently reviewed before declaring an actual peer. Do not supply a setup key in command line arguments, GitHub commit, CI logs or chat. Do not automatically start a privileged container.
   - NETBIRD_INSTALLED_BUT_TUN_SUPPORT_UNVERIFIED: NetBird binary alone is not a connected peer. Do not claim approval.
   - CI_RUNNER_NOT_A_DURABLE_GATEWAY or HOLD_*: do not try to force privileges, bypass Codespaces billing limits, or expose a public HTTP proxy.

4. When a legitimate second peer connects through the same authorized NetBird account, reopen the **Android NetBird Peers tab**. It should list the Linux client if both peers are connected and policy permits visibility. A client appearing is a registration signal, not the completed handshake.
5. Execute the **existing** NEO-MULTICLOUD-002 temporary NetBird-bound one-shot test responder on the Linux peer ONLY if that peer has a genuine kernel/TUN interface and accepted narrow NetBird policy. From Android, use the NEO-MULTICLOUD-005 read-only Termux request. For a rootless-only mode, do not use the kernel-interface-bound listener unchanged; a separately reviewed rootless network namespace test service is needed.
6. From the Linux peer independently inspect the NEO-MULTICLOUD-004 status observer; require an exact Android peer with a recent handshake. Do not publish raw NetBird output.
7. Test explicit deny and peer revocation after a successful authorized request, preserving access to the Codespace so a firewall or routing change cannot lock out the operator. The owner then disconnects/deletes the temporary peer in NetBird, stops the Codespace after review and preserves only sanitized audit states. Do not disable or replace the original Crown node's SentinelX enrollment.

## Acceptance

| Item | State |
| --- | --- |
| Existing devcontainer Ubuntu and Docker-in-Docker configuration reviewed | VERIFIED CODE |
| Available user Codespace / remaining cost allowance | NOT CHECKED |
| Actual Codespace TUN or rootless Docker viability | NOT TESTED ON USER MACHINE |
| Codex Linux persistent host capability | NOT VERIFIED |
| Phone NetBird client connected | VERIFIED USER SCREENSHOT |
| Phone visible second peer | NONE SHOWN ON USER SCREENSHOT |
| Actual second peer enrolled | NOT VERIFIED |
| Recent WireGuard handshake | NOT VERIFIED |
| Authorized private HTTP transaction | NOT EXECUTED |
| Guest access denied, revocation | NOT TESTED |
| Permanent gateway / automatic cellular failover | NOT CONFIGURED |

Decision: PILOT_COMPUTE_QUALIFICATION_READY; LIVE_PEER_HOLD.

Unit tests: node --test services/neo-vpn/tests/multicloud-007-compute-preflight.test.mjs

This feature branch and PR are draft-only, not automatically merged, deployed or authorized for production.
