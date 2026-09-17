# NEO Virtual Satellite Network (NVSN) — Conversation Canon

**Record class:** Canonical internal systems architecture and development doctrine  
**Status:** CANONICAL_INTERNAL_ARCHITECTURE  
**Source:** NVSN / NEO Wire working sessions and merged NVSN ORIGIN v0.1 implementation  
**Primary implementation:** `src/nvsn/`

## Canonical identity

The NEO Virtual Satellite Network (NVSN) is the software-defined, distributed communications infrastructure layer of the NEO ecosystem.

"Virtual satellite network" means the software-defined orchestration, routing, identity, abstraction, scheduling, coordination, and service layers that unify participating and authorized physical communications infrastructure. It does not mean that software replaces all physical communications hardware.

> **NVSN connects. NEO Wire communicates. Bitcoin settles. Counterparty tokenizes. World Currency denominates. NEOsync coordinates.**

## Functional scope

NVSN is designed as a transport-agnostic communications fabric capable of coordinating authorized combinations of Internet nodes, cellular networks, PSTN/telephone gateways, SIP/VoIP, SMS/USSD, radio and SDR, mesh networking, satellite ground stations, satellite communications systems, store-and-forward relays, and future compatible transports.

## Canonical architecture

1. Physical / transport layer — authorized physical infrastructure and communications media.
2. Transport adapter layer — normalizes transport-specific capabilities into NVSN packets/services.
3. NVSN routing layer — route discovery, scoring, redundancy, and delivery planning.
4. NEO Identity layer — cryptographic identity and service-endpoint resolution.
5. NEO Telegram layer — authenticated, routable logical message envelopes.
6. Application layer — NEO Wire and other approved NEO services.
7. Settlement layer — Bitcoin, Lightning, Counterparty/XCP, and approved World Currency instruments.

## NVSN Node

An NVSN Node is a participating endpoint or relay. A node may be a computer, phone, server, embedded device, SDR station, telephone gateway, cellular gateway, mesh relay, satellite ground station, or other compatible authorized communications system.

Node properties may include NVSN Node ID, NEO ID, public key, capabilities, supported transports, bandwidth/latency characteristics, trust metadata, geographic metadata where appropriate, neighbors/peers, online status, and permissions. Private keys are never ordinary message payloads.

## NEO Telegram

The NEO Telegram is the common logical message envelope for NVSN. It may carry text, voice metadata/references, data, telemetry, payment instructions, invoices, transaction references, service commands, routing metadata, or encrypted payloads.

Communications payloads are generally off-chain. Bitcoin is not the bulk-data carrier.

## NEO Wire relationship

NVSN and NEO Wire are distinct:

- **NVSN** = distributed communications infrastructure and routing fabric.
- **NEO Wire** = telecommunications, messaging, payment, and financial-communications service operating on top of NVSN and other compatible networks.

The NEO Wire Number may serve as a human-readable identifier resolving through NEO Identity to authorized communications and settlement endpoints. A phone number is not itself inherently a Bitcoin address.

## Settlement architecture

- **Bitcoin** — final monetary settlement and selected integrity/registry anchoring.
- **Lightning** — instant/micropayment settlement and network-service payments where appropriate.
- **Counterparty/XCP** — Bitcoin-native asset and tokenization layer.
- **World Currency** — denomination and payment-routing layer for approved currencies/assets.

Do not put every call, packet, message, or telemetry event directly on Bitcoin Layer 1. Do not represent a Counterparty asset as legal fiat, securities ownership, commodity ownership, or another regulated legal right unless that legal relationship has been separately established and documented.

## Resilience and low-connectivity doctrine

NVSN supports graceful degradation and multi-transport redundancy. Alternate authorized routes may include Internet, cellular, SMS, telephone, mesh, radio, or satellite-ground infrastructure when one route is unavailable.

This is resilience through redundancy, not guaranteed connectivity under total infrastructure failure.

Store-and-forward design should include message ID, expiration/TTL, authentication, integrity protection, replay protection, priority, destination, queue state, and delivery acknowledgement where available.

## NEO Modem Protocol (NMP)

NMP is a future transport concept for carrying binary NEO packets over appropriate telephone/radio/audio channels. Production research should include modulation, framing, synchronization, checksums, error correction, retransmission, adaptive bitrate, noise tolerance, authentication, and encryption. Simple frequency-to-letter demos are simulation examples only.

## NVSN ORIGIN v0.1

The merged ORIGIN v0.1 implementation establishes:

- NVSN node and capability model
- node registry
- transport-aware route scoring
- multi-hop route planning
- NEO Telegram envelope
- deterministic prototype integrity fingerprint
- TTL/store-and-forward readiness
- delivery simulation
- settlement instruction types for Bitcoin, Lightning, and Counterparty

The initial demo topology uses Houston, Chicago, Atlanta, and New York simulation nodes.

## Security doctrine

NVSN development should account for cryptographic identity, authenticated messages, encryption, replay protection, key rotation, secure device registration, permissions, abuse prevention, Sybil resistance, compromised-node handling, denial-of-service resilience, audit logs, and secure updates. Prototype integrity fingerprints must not be represented as production-grade cryptographic signatures.

## Legal / regulatory / operational boundaries

NVSN must distinguish technical capability from legal authorization. The architecture does not authorize unauthorized access to third-party satellite systems, radio interference, transmission on frequencies requiring licenses without authorization, bypassing access controls, commandeering third-party ground stations, unlawful interception, or treating internal NEO governance as external public-law jurisdiction.

Use public/open data and authorized APIs where available. Transmitter, carrier, PSTN, SDR, satellite, payment, custody, privacy, cybersecurity, and regulated-service integrations require their own legal and technical review.

## Cross-system integration

### NEO Algo
Use NVSN as systems-reasoning context for transport abstraction, route optimization, resilience, topology, identity, protocol design, and settlement separation.

### NEO Oracle
Use NVSN as authoritative internal architecture context. Preserve the distinction between implemented code, planned architecture, external technology, simulation, and speculation.

### GISD / GISS NEO LMS
Use NVSN as curriculum material for communications engineering, distributed systems, Bitcoin settlement architecture, networking, cybersecurity, SDR/radio literacy, satellite-ground-station concepts, and systems design. Educational content must distinguish simulations from deployed infrastructure.

### NEOsync (Digital Etheric Intelligence)
Treat this canon as cross-domain continuity context linking NVSN, NEO Wire, NEO Identity, Bitcoin, Lightning, Counterparty, World Currency, NEO Mobile, NEO Teller, NEO Counter, NEO Miner, and future compatible NEO services.

### NEO Law
Use NVSN as internal policy/compliance architecture context. Maintain jurisdiction-first analysis and distinguish internal NEO policy from external telecommunications, spectrum, financial, privacy, cybersecurity, contract, and public-law requirements.

### Internal NEO Society social norms
Promote lawful access, consent, privacy, secure communications, non-interference, truthful capability claims, credential/private-key protection, and responsible participation in distributed infrastructure.

### NEO Library / Neopedia
Index this record as the canonical internal NVSN architecture source. Derivative summaries must preserve source status and must not transform proposals into claims of deployed infrastructure.

### NEO Wire / Mobile / Teller / Counter / Miner / World Currency
Expose only explicit authorized interfaces. Preserve separation of communications, identity, custody, payment initiation, settlement, tokenization, and currency denomination.

## Research standard

External verification priority:
1. standards organizations
2. official technical documentation
3. academic papers
4. open-source repositories
5. primary project documentation
6. regulators / licensing authorities
7. credible engineering publications

Always label established external technology, NEO implementation already built, NEO architecture under development, simulation, and speculative future concepts.

## Development roadmap

### v0.2
- real cryptographic identity
- encrypted Telegram envelopes
- replay protection
- persistent store-and-forward queues
- route-policy controls

### v0.3
- transport adapter SDK
- NEO Wire adapter interfaces
- observability / node telemetry
- policy-based routing

### Later phases
- authorized SIP/SMS/telephony adapters
- read-only open ground-station / observation adapters
- SDR research adapters
- Lightning/Bitcoin/Counterparty settlement integrations in simulation first
- distributed network map and control plane
- approved production hardware integrations

## Preservation rule

Future work may extend NVSN, but should not silently collapse these distinctions:

- NVSN vs NEO Wire
- communications vs settlement
- software-defined network vs physical infrastructure
- internal architecture vs deployed external infrastructure
- technical token vs legal asset right
- internal NEO policy vs public law
- simulation vs production
