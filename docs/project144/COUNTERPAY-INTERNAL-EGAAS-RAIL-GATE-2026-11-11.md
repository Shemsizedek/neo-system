# Project 144 — Counterpay Internal Rail for NEO eGaaS

## Verified integration points
- `counterpay.holytemples.org` has a WordPress-managed CNAME to `custom-domains.chatgpt.site`; it is **not** the Render wallet staging host. Protected ChatGPT Sites source/runtime binding remains unverified.
- Existing eGaaS PR #1346 (`feat/egaas-bitcoin-anchor-preparation-20261107`) already implements private synthetic GISD custody, salted-commitment batching, and read-only Bitcoin/Counterparty verification adapters. This branch extends that PR rather than duplicating the anchor service.
- Existing agent wallet PR #1380 stages address proposals only, with no control proof or spending.
- Wallet-issuance draft PR #1408 has not been merged or tested on the live Counterpay domain.
- NeoMask Gate 124 defines an origin-scoped, device-local signing boundary. This gate does not invoke its sign methods.

## What this branch builds
- Internal Counterpay rail `POST /api/v1/egaas/internal-rail/prepare`, disabled by default.
- Caller must pass the trusted existing NEOpass subject resolver. Only opaque v4 UUID record references, private class labels and 64-byte-hex salted commitments are accepted.
- Classifications include identity, court filing, phone call logs, property, medical, government registration, education, agent work and financial intent. Highly sensitive classes require `HIGHLY_RESTRICTED` privacy.
- The rail calls `prepareEgaasAnchor` from PR #1346 and returns per-entry proof objects, a deterministic candidate batch root and `prepared_offchain` receipts.
- Strict request shape and size checks reject record contents, seeds, names, extra metadata, duplicate commitments and unsupported claims. This helps prevent accidental disclosure but is not a replacement for privacy review.
- No persistent store, payment, asset issuance, signing, network calls, broadcast or VM execution is implemented. A preparer response claiming any anchor authority or confirmed transaction is rejected.

## Operational division
1. **NEOpass** authenticates principals; permissions for a record class must be checked by the parent application before submitting the commitment.
2. **Private custody** encrypts original documents and handles retention, deletion, access control, and recovery. Sensitive data, salts and private identifiers are never broadcast or put in open metadata.
3. **Counterpay internal rail** prepares opaque commitments and receipts. A record UUID is an internal random reference, not a citizen, patient or property identifier.
4. **NEO Crown Chain** indexes off-chain evidence and later verified Bitcoin transaction inclusion. A Bitcoin transaction provides ordering/tamper evidence, not government acceptance or ownership authority.
5. **NeoMask + NEO Guardian** would separately approve and sign bounded transactions, if a future gate authorizes payment/anchoring.
6. **Bitcoin + Counterparty** remain the canonical chain/protocol rails. A per-record BTC amount is not needed: batching commitment roots avoids dust outputs and unnecessary network fees.
7. **BVM/NVM** is a future deterministic rules engine, not a separate chain or a bridge to EVM. It must not execute as part of this gate.

## Security and launch blockers
- There is no trusted wallet issuance or spending binding to the protected Counterpay Sites runtime; verify it independently.
- PR #1346 and its existing anchor/verification adapters must be reviewed and tested with this stacked branch before any merge.
- Tests of this branch are fixture-backed only. Local Node 22 tests are not proof of Node 24, HTTPS staging compatibility, a real signer, Bitcoin node inclusion, or durable storage.
- Secure the endpoint with authenticated roles and purpose-specific authorization, rate limits, replay controls, audit trails, and HTTPS. An authenticated general member must not automatically gain access to sensitive categories.
- Production high-sensitivity records need encryption, retention/erasure policy, access logs, privacy threat modeling, independent backups, and statutory/legal validation.
- Bitcoin block timestamps are approximate, and on-chain anchoring does not make a filing official. Filing/registration becomes effective only when the relevant authority accepts it.
- Confirm origin, CSP, supply-chain pinning, recovery, and test vectors for wallet issuance on HTTPS staging; do not enable issuance for real users yet.
- Agent/wallet bindings require proof of control, authority scoping, budget/fee limits, monitoring and revocation before funding.
- NEO's own docs require feature-branch/PR development. Do not push `main`, merge or deploy production from this gate.

## Acceptance and next gate
- `node --test server/neo-platform-api/counterpay-internal-rail-*.test.mjs`: 10 local isolated tests passed (core validation and HTTP route). They use stub anchor preparation, not a real Bitcoin node.
- `counterpayInternalRailEnabled` defaults to `false` in `createNeoPlatformApi`; do not expose publicly before role-based authorization design.
- Review the stacked PR; then test route against the real `prepareEgaasAnchor` module, existing eGaaS API tests, and an HTTPS staging environment with synthetic-only data.
- Payments, signing, broadcast, token issuance and wallet issuance remain disabled.
