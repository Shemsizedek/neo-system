# Project 144 — Counterpay internal rail for NEO eGaaS

## Target architecture
`NEOpass → authenticated eGaaS service → encrypted off-chain custody → salted record commitments → Counterpay internal rail → Crown Chain batch → NeoMask authorization → Bitcoin/Counterparty publication → independent inclusion verification`

**Stage in this PR:** Only the private batch-preparation boundary is wired, with a disabled-by-default authenticated HTTP route. No durable database, live wallet connection, user issuance, signing, broadcasting, payment, token transfer, or VM execution is activated.

### Live domain and source distinctions (verified November 11, 2026)
- WordPress DNS for `counterpay.holytemples.org` contains a CNAME to `custom-domains.chatgpt.site`. This confirms the configured DNS target, **not** ownership of the deployed Sites code or a verified wallet runtime connection.
- The existing eGaaS anchor service is in draft/unmerged PR #1346. This branch is intentionally stacked on `feat/egaas-bitcoin-anchor-preparation-20261107` so it reuses `prepareEgaasAnchor` rather than duplicating Crown hashing.
- NeoMask provider/signer interfaces already exist on main; their production wallet connectivity and signer approvals have not been established.
- The separate wallet-creation flow in PR #1408 remains draft/unmerged.
- Agent address proposals are isolated in PR #1380, all pending address-control verification.
- A Render NEO workspace contains an existing `neopay-retail-staging` static site for a retail preview on a different feature branch. It is not verified as a Counterpay production mirror or an HTTPS wallet-issuance staging host.

## Data and privacy contract
The endpoint accepts **only** `{ "entries": [ { "recordRef": "UUIDv4", "recordClass": "COURT_FILING", "privacy": "RESTRICTED", "commitment": "64 lowercase hexadecimal characters" } ] }`.

Record classes: IDENTITY, COURT_FILING, CALL_LOG, PROPERTY, MEDICAL, GOVERNMENT_REGISTRATION, AGENT_WORK, FINANCIAL_INTENT, EDUCATION, GENERAL.

- `recordRef` is an opaque randomized UUID, not a citizen number, name, address, case number, or other identifying value.
- `commitment` must come from a trusted custody implementation using independently generated high-entropy randomness and domain-separated hashing. A plain SHA-256 hash of a low-entropy medical, property or identity value is **not sufficient** to protect privacy.
- The API rejects all raw records and extra fields; sensitive categories are labeled HIGHLY_RESTRICTED.
- The Merkle root (not the entries or private metadata) is a **candidate** for eventual Counterparty/Bitcoin publication. Even a salted root can have residual linkage risks; policy and legal review remain required.
- Timestamp precision: an internal event timestamp can be recorded in a private audit log, but a Bitcoin block gives approximate block ordering/time and proof of inclusion, not trusted real-world event time.
- A Bitcoin transaction or internal community registry does not automatically constitute a government filing, recognized title record, medical record compliance or legally valid court filing. External official acceptance remains a separate evidence requirement.

## Signing and settlement
The rail never spends funds directly. Any future Bitcoin/Counterparty transaction requires NeoMask origin-scoped permissions, registered wallet control, NEO Guardian simulation, human or explicitly scoped agent approval, hardware/device-local signing, fee budgeting and independent mainnet confirmation/reorganization monitoring.

Agent work records are not payments. Operators must verify worker identity, address ownership and revocation before any wallet association; per-agent budgets, allowed assets/destinations, anti-replay controls and approval thresholds are separate gates.

## BVM / NVM
BVM (Bitcoin Virtual Machine): prospective deterministic rule-verification layer for Bitcoin/Counterparty receipts, manifests, hashes, and off-chain inclusion evidence. NVM (NEO Virtual Machine): prospective sandbox for controlled workflow state transitions, automated invoice policies, internal settlement simulation, record lifecycle logic and agent coordination. Neither name implies a Bitcoin consensus fork, a deployed smart-contract execution layer, real-world public authority, or a functioning live VM. Keep all execution offline until deterministic interpreter, resource limits, safety policy and tests are reviewed.

## Integrating the route
The branch adds `createCounterpayInternalRailHandler` to the existing NEO platform API with the constructor setting `counterpayInternalRailEnabled=false` by default. The route is `POST /api/v1/egaas/internal-rail/prepare`.

When disabled it returns 503; when explicitly enabled, unauthenticated requests return 401. It enforces an exact JSON schema and 64 KiB request limit. No public cross-origin permissions are added, and no outbound request, persistent writes or signer is used. Do **not** interpret enabling preparation as authorizing publishing.

## Verification and remaining gates
Local tests in a Node 22 container: `node --test server/neo-platform-api/counterpay-internal-rail-*.test.mjs`: 10/10 passed. `node --check` passed for the core and handler. Existing full application tests, real BIP39 recovery vectors, HTTPS browser staging, and live Bitcoin confirmation remain unverified in this work.

Before deployment:
1. Merge/review foundational PR #1346, then rebase this branch on the accepted base and rerun all platform/anchoring tests.
2. Resolve which protected ChatGPT Sites project serves Counterpay and make a controlled HTTPS staging copy; do not repoint DNS as a workaround.
3. Complete wallet creation/recovery E2E tests from PR #1408 on isolated HTTPS staging, verifying BIP39 address recovery using independent vectors and testing NeoMask integration.
4. Connect authenticated encrypted durable custody, access/retention rules, per-purpose salted commitments, tenant isolation and encrypted backups.
5. Confirm the separate operator-owned Bitcoin Core and Counterparty readers and proof-verifier chain; do not treat node height agreement as a Merkle inclusion proof.
6. Independently evaluate regulatory/privacy/legal constraints for medical, ID, property, court and government record classes. Do not place private data on-chain.
7. Keep the production gate closed: no fee spending, Bitcoin dust outputs, broadcasts, automatic document filings, token issuance, or real agent wallets are authorized in this branch.

**Decision:** Counterpay is the intended NEO internal payment and cryptographic anchor rail; Crown Chain is the application-level verifiable register; NeoMask signs. Batching is more efficient and privacy-preserving than assigning a small Bitcoin UTXO to every sensitive document. Bitcoin is an external proof anchor, not the exclusive source of protected records or legal recognition.
