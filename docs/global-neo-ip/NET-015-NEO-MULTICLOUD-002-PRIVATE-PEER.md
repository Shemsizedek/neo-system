# NEO-MULTICLOUD-002 — Live Peer Qualification & One-Shot Private Application Probe

Status: PRIVATE SERVICE SOURCE STAGED; LIVE VPN NOT ATTESTED
Date: 2026-11-13 America/Chicago
Review dependency: NEO-MULTICLOUD-001 (#1424), NET-007 and NET-008, NEO-CONNECT diagnostics.

## What the current connected systems prove

- SentinelX: **zero connected hosts**; original enrolled Crown node remains offline. Do not create duplicate enrollment or claim Crown is available.
- GitLab Project 144: the most recent observed pipelines on main had failed; one failed pipeline had no returned jobs. This is insufficient evidence to claim an independent worker or successful cross-cloud operational redundancy. Do not attach a secret-bearing new job without reviewing the repository and CI failure reason.
- Vercel: no projects returned for the connected account in the previous inventory; do not claim a named sandbox exists or create billable machines.
- Render: the previous inventory found HTTP applications and static sites, not proven persistent NetBird/WireGuard peers. No service was resumed, deployed or changed.
- The Android phone successfully ran its Termux storage/public HTTPS diagnostics. It did **not** prove NetBird enrollment or a two-peer handshake.

**No currently connected platform is proven to be an independent, active VPN machine.** Therefore the first meaningful network task is a consenting operator's Android client plus one real, authorized machine. A personal two-device smoke test is useful but does not satisfy the separate-operator institutional NET-008 gate.

## No-cost manual two-device pilot

Device A: Android, official NetBird VPN application. The owner must authenticate through approved SSO, accept VPN permission, review current free-plan eligibility/terms, and verify the device's connected status. Termux provides the application-level request, not the NetBird VPN daemon.

Device B: an actual controlled and authorized Linux machine with Node.js and the official NetBird Linux client. Use a local terminal. If Crown is offline, use a *different explicitly approved* and reachable computer. Do not attempt to repurpose Render HTTP web instances, a transient GitHub Codespace, GitLab runner, Neon database or model API as a permanent Linux VPN gateway.

1. Confirm each is an enrolled authorized NetBird peer on the **same approved NetBird account**, and note each device's NetBird-assigned peer IP locally. A NetBird 100.64.0.0/10 address is **not** NEO's proposed 10.144.0.0/16 segment.
2. Set a narrowly scoped NetBird **peer-to-peer** rule: authorized Android peer → approved Linux test peer on **TCP 18443** only. Ensure the narrow rule is working before disabling a broad Default policy; remove Default before admitting guests or partners. Do not advertise a NEO private network route for this test.
3. On the Linux device, once a NetBird IPv4 is active, run this short-lived private test server from the reviewed feature branch:

       node services/neo-vpn/diagnostics/multicloud-002-private-probe.mjs --listen-ip SERVER_NETBIRD_IP --allow-peer ANDROID_NETBIRD_IP

   Both placeholders must be replaced **locally** with the actual 100.64.0.0/10 overlay IPs. Never put real device IPs, private keys, setup tokens, network logs or SSO details into the public GitHub PR. The code refuses localhost, 0.0.0.0, public IPs, or non-overlay bindings. It serves only GET /neo-private-probe, expires after 120 seconds, and stops after one permitted request. Its response contains fixed status markers; it is **not** an HTTP forward proxy and cannot access files or internal APIs.
4. With the Android NetBird app connected, in Termux run:

       curl -fsS --max-time 8 http://SERVER_NETBIRD_IP:18443/neo-private-probe

   Observe a response marked PRIVATE_APPLICATION_RESPONSE. A failure can be due to missing policy, missing peer session, the wrong IP, port filtering, or Android VPN split-tunnel configuration. Do not fix by opening a public ingress.
5. Verify **separately** on the authorized Linux device using `netbird status -d` that Device A's peer is **Connected**, note P2P/Relayed and a *recent WireGuard handshake*. Keep the raw status local: it may contain device names, IPs and keys. The probe's response alone does **not** prove that transport was encrypted or that the two physical devices were independently controlled.
6. Independently verify a blocked access attempt by a nonauthorized guest pilot peer; re-evaluate allowed vs denied paths. Confirm device revocation and application session revocation before anyone calls this a production-access policy.
7. Only after the first real peer service works, separately qualify a persistent routing machine and the reserved NEO 10.144.x.x service range. It is not activated by a direct peer application test.

## Security and budget

- No new cloud account, VM, paid trial, production service, secret, VPN key, device enrollment, firewall/DNS change or cloud CI job is created by this PR.
- The test listener is not a publicly accessible proxy. It binds only to an explicit NetBird overlay IP, accepts only an exact peer overlay address and GET path, and has a bounded lifetime.
- Do not install an additional Android VPN on top of a currently required VPN without reviewing Android's VPN concurrency restrictions.
- The Android phone and Linux peer may use a relayed connection when direct NAT traversal fails. Relay traffic is still WireGuard-encrypted, but can have extra latency. No Wi-Fi signal amplification or internet bandwidth bonding is provided.
- For a larger local Wi-Fi footprint, configure physical access points/mesh, preferably wired-backhaul; for local internet failover, use an independent cellular uplink plus approved WAN failover equipment.

## Current acceptance matrix

| Requirement | Result |
| --- | --- |
| Phone public HTTPS and app storage | PASSED (operator screenshot) |
| Authorized Linux host currently reachable | NOT ATTESTED |
| Phone and Linux NetBird peers enrolled | NOT ATTESTED |
| NetBird peer-to-peer TCP 18443 policy | NOT CONFIGURED |
| One-shot private probe HTTP response | NOT EXECUTED |
| Actual recent WireGuard handshake | NOT ATTESTED |
| Blocked guest access and revocation | NOT TESTED |
| Live NEO 10.144 route | NOT ATTESTED |
| Automatic Wi-Fi/cellular failover | NOT CONFIGURED |

Decision: HOLD_PENDING_DEVICE_ENROLLMENT_AND_PRIVATE_PROBE. A passing automated unit test is code validation, not a live peer tunnel.

## Tests and official references

`node --test services/neo-vpn/tests/multicloud-002-private-probe.test.mjs`

Official NetBird documentation:
- https://docs.netbird.io/get-started/install/android
- https://docs.netbird.io/get-started/install/linux
- https://docs.netbird.io/get-started/cli
- https://docs.netbird.io/help/troubleshooting-client
- https://docs.netbird.io/manage/networks/how-routing-peers-work
- https://docs.netbird.io/help/troubleshooting-relayed-connections
