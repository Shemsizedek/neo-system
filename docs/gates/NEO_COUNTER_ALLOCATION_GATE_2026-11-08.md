# NEO Counter payment allocation gate

Date: 2026-11-08. Baseline: 0dda22e3a72ddfa27a84146bd459269f0db7daf3.

## Verified evidence

- PR #1349 is open and unmerged. Its NEO Counter Gateway CI run 42456087305 completed successfully. This gate builds independently on main and does not claim the observer fix is deployed.
- Read-only Render inventory of NEO SYSTEM (`tea-dbhtkc8473hc73933img`) listed 13 services, including NEO Bank staging and Noogle staging. No service named NEO Pay or NEO Counter staging was present. This is inventory evidence, not a universal claim that no checkout runtime exists elsewhere.
- Existing Counter merchant login uses the terminal/staff credential flow. No integrated NEOpass -> NeoMask -> Counter checkout was demonstrated.
- Existing backend adapters include SQLite, Redis REST and Firestore; the new allocation implementation applies to SQLite only.

## Change and validation

Added an opt-in internal server allocation boundary in the existing SQLite store. It stores immutable order expectations, requires a trusted verifier, checks payment-specific chain evidence, and atomically reserves one canonical payment event for one merchant/order. It does not move money, sign, broadcast or mark browser callbacks authoritative.

The payment locator is network + rail + transaction hash + canonical event/output index. The database enforces global uniqueness across merchants/orders and one allocation per order. Atomic-unit strings avoid floating point amount comparisons. Retries reverify evidence. Expiry during verification, changed block evidence, insufficient confirmations, mismatches and malformed evidence fail closed.

Validation: `npm run neo-counter:server:test` passed all 19 tests (8 new allocation tests, including malformed-evidence fixtures, idempotent retries, persisted restart and two-connection races). `git diff --check` passed. Verifier and chain evidence are synthetic; no live chain or wallet flow was tested.

## Gate status

- VERIFY: complete for source, prior CI and named Render inventory; live checkout health remains unknown.
- CONNECT: blocked for live chain verifier and isolated checkout staging runtime.
- BUILD: complete for opt-in SQLite allocation component.
- TEST: synthetic/backend tests complete; live integration pending.
- DEPLOY: pending maintainer review and staging wiring. Production unchanged.
- DOCUMENT: this record and backend API documentation.

## Prioritized next milestone and acceptance

1. Review both payment PRs. Validate actual Counterparty schema against PR #1349's strict matcher before release.
2. Select the actual checkout backend and provide a server-configured independent Bitcoin/Counterparty verifier. If Redis/Firestore is selected, implement its allocation adapter with equivalent uniqueness and concurrency tests before enabling any endpoint.
3. Wire an authorized, Crown-controlled staging order/observation route to immutable merchant-owned order and wallet configuration. Never accept expected amount/destination from an untrusted return URL.
4. Demonstrate synthetic NEOpass login, NeoMask consent, vendor QR/address display, independently verified observation, atomic allocation, and a receipt. Confirm the same payment cannot fulfill another order.
5. Test reorgs, expired quotes, wallet cancellation, duplicate polling, mismatched asset/network/destination and provider failure before release. Keep fulfillment closed when evidence is unavailable.

No deployment, new spending, privileged identity changes or financial transactions occurred. No new approval is needed to continue source/staging preparation within existing authorization; live dependencies remain unverified.
