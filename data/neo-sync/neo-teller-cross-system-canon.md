# NEO Teller Cross-System Canon

**Record class:** Canonical internal NEO System architecture and operating policy  
**Source:** NEO Teller development conversation through v0.8  
**Status:** CANONICAL_INTERNAL_ARCHITECTURE  
**Parent:** NEO System

## Purpose

Register NEO Teller as the ATM/teller execution component of the NEO financial architecture and route its engineering, security, accounting, legal, educational, and social-control principles into NEO Algo, NEO Oracle, GISD/GISS NEO LMS, NEOsync (Digital Etheric Intelligence), NEO Law, Internal NEO Society Social Norms, NEO Router, NEOpay, NEO Counter, NEO Exchange/DEX, NEO Explorer, NEO Evidence/Audit, NEO Library/Neopedia, and related authorized services.

## Architecture

- **NEO Teller:** ATM/teller transaction and device-control layer.
- **Bitcoin:** base settlement/cryptographic rail.
- **Counterparty/XCP:** Bitcoin-native asset and transaction protocol used for supported assets such as XCP and NOMNI.
- **NEOpay:** user-controlled wallet/signing boundary.
- **NEO Counter:** merchant/POS counterpart.
- **NEO Exchange / DEX:** exchange and Counterparty DEX counterpart.
- **ETHA / NEOLPS:** conceptual NEO payment/network abstraction; not a claim of current regulated network membership.
- **NEO Router:** orchestration/routing layer for authorized Teller events and outputs.
- **NEOsync:** operational agent layer consuming authorized Teller state, telemetry, reconciliation, and exception outputs.

## Versioned controls preserved

### v0.1 — Origin
Teller domain model, transaction state machine, double-entry helper, sandbox dashboard, account/asset/card/ATM/settlement entities.

### v0.2 — Live data rails
Read-only Bitcoin/Counterparty health and asset metadata gateway; Teller frontend route; configurable Counterparty and Electrs/Esplora sources.

### v0.3 — User-controlled signing boundary
Compose-only Counterparty send flow. Backend rejects private-key, WIF, seed, mnemonic, xprv, password, and similar secret fields. Backend cannot sign and does not broadcast at this gate.

### v0.4 — Wallet signing handoff
Unsigned transaction is handed to a user-controlled signer such as NEOpay, compatible browser wallet, hardware wallet, or external/offline signer. Signed artifact may return to Teller; private keys do not.

### v0.5 — Explicit broadcast controller
Broadcast is a separate affirmative operation for an already-signed transaction. Signed-transaction fingerprint binding is required. Broadcast status is tracked from submission/mempool through Bitcoin confirmation.

### v0.6 — Settlement ledger and receipt engine
A transaction remains SETTLEMENT_PENDING until the configured confirmation policy is met. Settlement creates balanced debit/credit records and tamper-evident SHA-256 receipts.

### v0.7 — Reconciliation and ATM cash inventory
Reconcile blockchain settlement, Teller ledger records, and physical machine cash. Non-zero differences become explicit SHORTAGE/OVERAGE or settlement mismatch exceptions requiring review; variances are not silently absorbed.

### v0.8 — Vendor-neutral ATM hardware abstraction
Stable hardware interface for cash dispenser/acceptor, receipt printer, barcode/QR scanner, card/NFC reader, secure element, PIN pad, camera, UPS, and network modules. Heartbeat telemetry drives ONLINE/DEGRADED/OFFLINE/LOCKED state. Tamper events force LOCKED. Remote lockout is permitted under authorization; remote unlock is prohibited and requires local service intervention.

## Canonical security rules

1. Teller is non-custodial by design unless a future separately approved regulated custody architecture explicitly changes that boundary.
2. Never request, transmit, log, persist, or expose user private keys, WIFs, seed phrases, mnemonics, xprvs, or equivalent signing secrets.
3. Signing occurs in a user-controlled wallet/hardware/offline boundary.
4. Transaction composition, signing, validation, broadcast, confirmation, settlement, reconciliation, and physical cash movement are distinct auditable states.
5. Broadcast requires explicit user authorization; automatic mainnet broadcast is not the default.
6. Signed transactions must be bound to the expected transaction intent before broadcast.
7. Settlement requires the configured Bitcoin confirmation threshold.
8. Ledger entries must balance before settlement is accepted.
9. Physical cash variance and blockchain/ledger mismatch are review exceptions, not balancing plugs.
10. Tamper detection must fail closed and lock the affected ATM.
11. Remote operators may lock a machine; remote unlock is not an ordinary administrative capability.
12. Public production deployment requires authentication, authorization, rate limiting, restrictive CORS/origin policy, audit logging, secure configuration, and controlled infrastructure endpoints.
13. Use BigInt/string-safe quantity handling for Counterparty base units; do not rely on unsafe JavaScript Number precision for large quantities.
14. Use network-aware Bitcoin address validation rather than regex-only validation before production.
15. Counterparty Taproot commit/reveal flows must be modeled separately where applicable; do not assume every composition is a single unsigned transaction.

## Cross-system routing

- **NEO Algo:** transaction-state reasoning, risk gates, confirmation policy, reconciliation logic, exception classification, device-state reasoning.
- **NEO Oracle:** answer from Teller state with provenance; distinguish design intent, sandbox/testnet state, deployed capability, and externally verified network facts.
- **GISD/GISS NEO LMS:** curriculum modules for Bitcoin/Counterparty transaction lifecycle, non-custodial signing, double-entry settlement, reconciliation, ATM operations, device security, and compliance boundaries.
- **NEOsync:** orchestrate authorized health checks, alerts, settlement/reconciliation workflows, maintenance queues, and audit events; never bypass signing or broadcast approvals.
- **NEO Law:** map Teller functions to applicable payments, money transmission, virtual-currency, securities, privacy, consumer-protection, AML/KYC, sanctions, accessibility, cybersecurity, and ATM/operator requirements by jurisdiction. Internal NEO classifications do not substitute for positive law or licenses.
- **Internal NEO Society Social Norms:** informed authorization, user control of keys, transparent fees/status, no silent settlement adjustments, operator accountability, tamper response, privacy minimization, and auditable exception handling.
- **NEO Router:** route telemetry, transaction events, receipts, exceptions, and maintenance signals to authorized downstream systems according to least privilege.
- **NEO Evidence/Audit:** preserve hashes, timestamps, transaction IDs, device IDs, state transitions, reconciliation records, operator commands, and provenance without storing signing secrets.
- **NEO Library / Neopedia:** maintain architecture documentation and derivative educational knowledge while preserving source/status distinctions.

## Legal and factual boundaries

- Visa-, SWIFT-, bank-, card-network-, or global-payment-network analogies describe intended functional architecture only and are not claims of membership, certification, sponsorship, connectivity, licensing, or production access.
- Fiat/card/bank/SWIFT-style connectivity requires separately verified regulated providers, agreements, certifications, and jurisdiction-specific compliance.
- Tokenized ATM ownership, revenue rights, profit participation, or investment interests may implicate securities and other financial regulation and must not be represented as automatically compliant.
- NOMNI/XCP prices, liquidity, capitalization, and market availability must be independently verified before financial decisions or customer-facing representations.
- GitHub is source-of-truth/CI/static-hosting infrastructure; an always-on transactional Teller API requires an appropriate runtime and secured operational environment.

## Forward roadmap

**v0.9:** authenticated ATM fleet enrollment, device certificates/attestation, configuration profiles, fleet grouping, maintenance state, staged software/firmware deployment, and audited operator commands.

Future gates must preserve the security, provenance, accounting, legal-status, and explicit-authorization rules above unless a later canonical decision expressly supersedes them.