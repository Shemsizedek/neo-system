# NEOFINITY-INF-001 — Proposed NEO Internet Service: launch charter and implementation gate

**Date:** 2026-11-09  
**State:** PRE-LAUNCH; architecture and catalog only.  
**Tracking issue:** https://github.com/Shemsizedek/neo-system/issues/1394  
**Predecessors:** Global NEO IP NET-007 and NET-008; infra/neo-network; services/neo-vpn.  
**Cost policy:** Additional committed spend = $0. Do not deploy, accept orders, claim coverage, or start any subscription by merging this document.

## 1. Service definition and critical distinction

Neofinity is the proposed NEO-branded Internet-services program, not an already registered provider or legal entity.

A private encrypted mesh (Neofinity Mesh) creates a secure path between authorized devices **over existing Internet connections**. It is NOT itself an Internet access service or an independently routed network. It cannot replace an upstream ISP, a physical wired/wireless uplink, a public IP allocation or a real gateway.

A customer broadband ISP (Neofinity Access / Business) needs actual legal and technical access to bandwidth, customer premises, radio or fiber infrastructure, routing, monitoring, customer support, appropriate terms, and regulatory review. It may start with a licensed/authorized wholesale provider and later own more facilities.

Independent IP service (Neofinity IP) is a later capability based on an actual ASN and assigned address resources, real transit/peering, BGP route policy and RPKI. A private 10.144.0.0/16 WireGuard address is never a public Internet assignment.

## 2. Existing NEO assets to reuse, not duplicate

- Canonical private routing: 10.144.0.0/16, gateway 10.144.1.0/24, administration 10.144.10.0/24, service 10.144.20.0/24; guest 10.144.50.0/24 and partner 10.144.60.0/24 are planned, not certified as live.
- infra/neo-network specifies zero-trust identity, node attestations, WireGuard-compatible transport and provider-neutral routing plans.
- services/neo-vpn contains WireGuard, nftables policy and activation documentation.
- docs/global-neo-ip/NET-007-FREE-MESH-PILOT.md identifies legal no-charge pilot candidates, risks and GCP independence.
- docs/global-neo-ip/NET-008-FIRST-MESH-ACCEPTANCE.md defines the first real 2-device test.
- No verified enrolled NetBird account, running NEO-owned gateway, real two-peer handshake, private routed service, revocation or independent ASN is established by these repository files.

NEOpass may later handle subscriber/member identity, but VPN membership never replaces application-level authentication. NEO Bank, wallets, treasury, seller/buyer financial records and staff control planes must never be on open guest Wi-Fi or a broad allow-all overlay.

## 3. Product/service catalog and initial service levels

| Service | Transport | Launchable today? | Launch proof |
|---|---|---|---|
| Mesh | WireGuard/replaceable managed mesh | NO | Two distinct approved devices, actual handshake, restricted allow/deny and revocation |
| Access | Wholesale/dedicated last-mile backhaul plus compliant wired/fixed-wireless CPE | NO | Legal upstream authorization, usable uplink, premises rights, policy/label and pilot |
| Business | Dedicated or managed business connectivity | NO | Verified capacity/SLA, security and commercial support |
| IP | Public IPv6 + assigned ASN, BGP, transit/IXP | NO | Number/resource rights, peering, route security, independent acceptance |

No advertised prices, data allowances, speeds, coverage, uptime promises, grants, tax exemptions or regulatory filings are implied. Any pricing or forecast requires measured costs and clear disclosure.

## 4. Layered network architecture

### Physical access
- Customer premises: authorized first site, electricity/UPS plan, weather-safe CPE, managed router/AP, site survey and permission.
- Access technologies: Ethernet/fiber, compliant fixed wireless point-to-point or multipoint, and later mesh backhaul where technically warranted; licensed spectrum needs proper licenses and unlicensed radios must follow applicable FCC equipment/operation limits.
- Upstream: wholesale/dedicated backhaul contract or explicit rights to redistribute, not an unmodified residential plan presumed resellable.
- Each node records its owner, power and backhaul dependencies, peer role, downtime window and revocation path.

### Routing/security
- Default deny across management, finance, subscribers, guest/partner and service zones.
- Public IPv6 assignment/delegation requires rightfully issued prefixes; IPv4/CGNAT/NAT only after design and subscriber retention/privacy review.
- DNS resolvers, DHCP/IPv6 RA and PD, QoS, bandwidth metrics and safe route handling must be tested against real physical paths.
- No blind announcement of private IP ranges; no BGP until AS/prefix authorization, transit/peering policy, filtering and RPKI validation.
- Rotate/revoke per-device credentials; log minimally necessary metadata and protect customer traffic privacy.

### Commercial operations
- NEO customer portal: availability screening, informed consent, broadband labels, order status, billing, support and trouble tickets.
- Separate member sign-in (NEOpass or approved alternative) from underlying network authentication and router/firewall policy.
- Human oversight for contracts, service cutovers, billing activation, complaints, emergency response and legal requirements.
- Support/failure handling: clear outage notice, escalation point, no claim of uptime before measured pilot performance.

## 5. Real first-site gate, in order

**Gate 1 — Brand and entity:** Check USPTO and common-law marks, domain names, state name/DBA, geographic service overlap and business class with counsel as needed. Existing unrelated uses include neofinity.com and neofinity.in; neither domain nor a mark is assumed available. Identify the actual legal operator and insurance/tax obligations. Until cleared, Neofinity is a proposed internal label.

**Gate 2 — NET-008:** On lawful no-charge service terms, enroll two independently controlled authorized devices with MFA in an eligible provider-neutral mesh; verify real packet transport, explicit allow/deny, guest block, revocation and documented evidence. A provider dashboard showing “connected” alone is not sufficient.

**Gate 3 — Houston-area site feasibility:** Select one authorized premises (for example a partner venue or NEO facility) without asserting the user has property control. Record site permission, upstream options, a no-commit quote for dedicated/wholesale backhaul, equipment reuse, radio/roof/ROW issues, public service area and estimated recurring cash expense.

**Gate 4 — Legal/compliance:** Identify specific FCC BDC and Form 477 reporting obligation based on facilities ownership/service model, broadband consumer labels for each marketed plan, network management disclosure, privacy policy, customer terms, cybersecurity/abuse response, tax, state/local rights-of-way, pole attachments and spectrum requirements. Internet-only, voice, resale and physical infrastructure may have different obligations. Obtain relevant specialist review before retail activation.

**Gate 5 — Technical pilot:** Two approved access customers or test endpoints; documented upstream permission; successful end-to-end Internet traffic; DNS; IPv4 and/or IPv6 tests; measured latency/throughput; subscriber isolation and guest denial; outage recovery; access/device revocation; safe logging; site owner's approval. Publish only redacted evidence.

**Gate 6 — Controlled offer:** Only after legal, technical, customer service and disclosure gates are accepted: approve real plans with costs, prices, limits, cancellation terms and payment processor onboarding. Never collect a subscriber payment while catalog state is PRE-LAUNCH.

**Gate 7 — Autonomous Internet route:** After real demand and multi-carrier economics exist, evaluate ARIN ASN and IPv6 resources, transit, exchange points, leased lines, multihoming, BGP policy/RPKI, support staff and ongoing fees. Do not turn on public BGP from a development host.

## 6. Financial/no-spend controls

- Initial baseline incremental cloud cost: $0; existing personal Internet/device costs are not “free,” and physical last-mile deployment is not expected to be free.
- Prefer owned equipment and zero-incremental-cost software only within actual provider terms, capacity and business-use licenses.
- Never silently activate paid trials, paid hosting, carrier commitments, hardware orders or paid upgrades. No fake accounts or quota evasion.
- Any needed expenditure gets an itemized need, vendor/term, alternatives, evidence, risk, responsible payer and explicit approval.
- Donor solicitations, if authorized later, must state exact funding purpose and avoid claiming approvals, guaranteed performance or already-operating coverage.

## 7. Compliance source checklist (must revalidate before service launch)

- FCC broadband transparency / consumer label: https://www.law.cornell.edu/cfr/text/47/8.1
- FCC broadband availability and subscription reporting: https://help.bdc.fcc.gov/hc/en-us/articles/7682769466395-Broadband-Data-Collection-BDC-FAQs
- ARIN public ASN and address requests: https://www.arin.net/resources/guide/request/
- ARIN fees: https://www.arin.net/resources/fees/fee_schedule/
- Houston franchise/ROW considerations: https://houstontx.gov/ara/franchise/cable-telecom.html
- US trademark search process: https://www.uspto.gov/trademarks/search/federal-trademark-searching

As of November 2026, ARIN's smallest published 3X-Small category is $275 on its fee schedule (not a free allocation); fees and eligibility must be reconfirmed before a request. FCC obligations depend on actual offerings. Review the 2026 FCC broadband-label rule amendments and effective-date notices before generating labels.

## 8. Machine-readable status controls

Source of proposed status: services/neofinity/catalog.json  
Consistency tool: node services/neofinity/assess-catalog.mjs  
Unit checks: node --test services/neofinity/tests/catalog.test.mjs

The tool detects policy-inconsistent catalog claims. It does not interrogate customer routers, carriers, FCC accounts, domains, NetBird peers or public routes and therefore cannot prove any real network activation. Its report expressly states this limitation.

**Acceptance today:** issue and source/configuration prepared, review-only. Gateway, upstream, actual ISP operations, customer plans, licensing and commercial service remain HOLD.
