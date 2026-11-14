# NEO-MULTICLOUD-001 — Existing-Platform Federation & Gateway Qualification

Status: REVIEW-ONLY / NO PRODUCTION VPN OR NETWORK RELAY ATTESTED
Reviewed: 2026-11-13 America/Chicago
Canonical implementation: services/neo-vpn/federation/provider-policy.mjs
NEO private service address space: 10.144.0.0/16 (not an address allocated by any hosting provider)

## Goal

Use the user's existing platforms to federate **transport, HTTPS control, temporary diagnostics, persistent records and AI inference**, with no new paid resource or duplicated gateway. An app, connected API, serverless function or build runner is not automatically an always-on operator-controlled network gateway.

The pure module services/neo-vpn/federation/multicloud-capability.mjs classifies known provider surfaces and evaluates candidate evidence without using any cloud API, enrolling peers, opening ports, modifying a firewall, advertising routes, writing secrets, or attempting failover. Submitted evidence is treated as a self-report pending independent verification.

## Read-only account inventory

| Provider | Connector-observed facts | Planned role | Not established |
| --- | --- | --- | --- |
| Render NEO SYSTEM | 18 not-suspended services, 16 web and 2 static | Existing HTTPS control/diagnostics | UDP WireGuard listener or always-on host |
| Render NEO workspace | 22 suspended services, 14 web and 8 static | Historical/staging recovery candidates | Active compute; no unsuspend authorized |
| GitHub | NEO System repository and CI | Canonical code, tests and configuration review | Permanent Codespaces/Actions gateway |
| GitLab | One private Project 144 membership project | Independent CI/source lane if reviewed | Always-on routing worker |
| Neon | Multiple managed PostgreSQL projects | Non-secret status, audit and registry storage | NET_ADMIN access or arbitrary VPN daemon |
| Vercel | Connected listing returned 0 projects | Optional HTTPS function platform | Existing production deployment |
| SentinelX | 0 connected hosts; crown-node-001 offline | Host management after physical recovery | Running router |
| Grok / Muse / other AI model APIs | API inference capability is not VM tenancy | Incident analysis and human-reviewed proposals | Operator access to model-provider machines |
| NetBird | Existing NEO pilot design; no observed two-peer handshake | First encrypted mobile-to-device mesh | Live NEO private subnet or gateway failover |

Service count and connected account status are not measures of independent network capacity or internet bandwidth. Suspended resources remain suspended; Render free HTTP web services are not standalone public WireGuard UDP servers.

## Control-plane architecture

- Transport: authorized Android NetBird application plus independently enrolled Linux or other approved client. The provider-assigned 100.64.0.0/10 peer address is not a 10.144.x.x NEO address.
- HTTPS operations: keep existing Render NEO SYSTEM services as potential status and control interfaces; no production service changes in this gate.
- Backup automation: GitHub for canonical CI; GitLab Project 144 as an optional independently reviewed mirror and diagnostic runner, not a persistent gateway.
- State: Neon can later store scoped, minimal device/heartbeat summaries, but only with approved schema, authentication and least privilege. Never store WireGuard private keys or identity tokens.
- Inference: AI models may classify incidents and draft recovery actions but do not obtain privileges to change routes, credentials or firewall policies automatically.
- Gateway: must be independently owned/authorized, always-on and suitably connected, with approved budget, real peer handshake, resource reachability, restricted access and revocation. A completely filled operator checklist is not by itself independent certification.

## High availability

A standby VPN peer is not established merely by operating separate websites. Require two individually verified routing peers in independent failure domains, explicit NetBird Networks routing and restricted policies, successful allowed/denied private-resource probes, revocation drill and recovery path. NetBird peer selection and failover do not imply load balancing or seamless continuity of established TCP connections. Preserve narrow routes (for example a reviewed /32 target) rather than advertising the whole 10.144.0.0/16 network.

Physical Wi-Fi range still requires a better placed or wired-backhaul access point/mesh. Last-mile failover requires a genuinely independent ISP/cellular uplink and an approved router/client mechanism. Cloud AI inference cannot increase radio strength.

## Acceptance checklist

| Requirement | Current state |
| --- | --- |
| Provider inventory and source-backed classification | OBSERVED / STAGED |
| Android public HTTPS connectivity | CONFIRMED BY OPERATOR SCREENSHOT |
| Two independent authorized encrypted peers | NOT ATTESTED |
| Existing Crown Linux host available | OFFLINE |
| Operator approval and gateway host controls | NOT ATTESTED |
| NEO private resource reachability | NOT ATTESTED |
| Second independent routing host | NOT ATTESTED |
| Cellular/Wi-Fi last-mile failover | NOT ATTESTED |
| Automated production cutover authorization | NOT GRANTED |

Decision: HOLD_PENDING_INDEPENDENT_PHYSICAL_GATEWAY_AND_TWO_PEER_EVIDENCE. No live mesh, gateway, WAN bonding, purchased capacity or independent network redundancy has been verified by this policy.

## Safe next actions

1. Have the Android owner enroll the official NetBird client and approve the OS VPN permission; keep other Android VPN dependencies in mind.
2. Restore existing crown-node-001 from its real Linux console, or qualify a separately controlled available device through approved NetBird enrollment.
3. Observe a genuine encrypted peer handshake, authorized private HTTPS request, denied guest access, and successful revocation.
4. Review a second independently operated routing peer only after the first works; separate failure domains and keep budget USD 0 of additional cloud infrastructure.
5. Keep the controller read-only until a production release is separately approved.

## Sources and validation

- NetBird: https://docs.netbird.io/manage/networks/how-routing-peers-work and https://docs.netbird.io/manage/networks/sizing-routing-peers
- GitHub Codespaces idle stops: https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-your-connection-to-github-codespaces
- Render: https://render.com/docs/web-services and https://render.com/docs/free
- Existing NET-007, NET-008 and NEO-CONNECT 001-005 workstreams and live read-only connector inventories.

Test command: node --test services/neo-vpn/tests/multicloud-capability.test.mjs

Automated tests are pure/mocked; they are never proof of real device connectivity, live routing, private-network acceptance or failover.
