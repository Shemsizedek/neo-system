# Project 144 — Counterpay Internal Rail / NEO eGaaS

## Architecture and hosting evidence

- On 2026-11-11 WordPress-managed DNS for `counterpay.holytemples.org` was verified as a CNAME to `custom-domains.chatgpt.site`. Its ChatGPT Sites deployment is **not** a verified GitHub or Render source binding. Do not retarget DNS without explicit change control.
- Render's previously confirmed `NEO workspace` has `neopay-retail-staging` at `https://neopay-retail-staging.onrender.com`, but it builds `apps/neopay-retail-preview` from `feat/neopay-ux-001-retail-preview`. It is **not** a staging deployment of PR #1408 or this internal-rail code.
- Existing unmerged PR #1346 provides the eGaaS salted commitment batch preparation and independent read-only verification components. This branch is stacked on PR #1346; **do not merge directly to main** until the base PR is reviewed.
- PR #1380 proposes operator-controlled, pending-verification wallet address bindings for agents. PR #1408 proposes BIP39 user wallet issuance. Neither is activated here.
- NeoMask Gate 124 exposes an origin-scoped permissions and external-signing interface, but no production hardware signer or signing authority is assumed.

## Internal role separation

1. **NEOpass:** authorized identity/session and scoped operator controls.
2. **Private custody:** encrypted content storage, role-based and purpose-restricted access. Personal records and original documents are *never* put on Bitcoin.
3. **NEO eGaaS evidence registrar:** only accepts opaque unique per-record random UUIDs and externally prepared, domain-separated, random-salted SHA-256 commitments. Never unsalted hashes of low-entropy data.
4. **Counterpay internal rail:** prepares up to 128 commitments as one Crown Chain batch and maps each to an offline proof reference. This is not a payment rail activation.
5. **NeoMask / NEO Guardian:** separate future transaction signer, fee cap, budget, whitelisted destination, hardware control and authorization enforcement for workers, bots, and humans.
6. **Bitcoin / Counterparty:** future optional transaction broadcast of one approved batch root, not one fee-bearing UTXO or dust transfer per record. A transaction timestamp is a coarse public-block timestamp, not the exact time an event occurred.
7. **NEO Crown Chain:** receipt/proof registry that changes from `prepared_offchain` to `verified_onchain` **only** after independent Bitcoin inclusion checks and authorized Counterparty interpretation. Existing PR #1346 supplies a separate read-only verifier; this module never upgrades status.
8. **BVM/NVM:** optional *future* policy/scripting interface for deterministic rule evaluation or workflow receipts. Neither constitutes new Bitcoin consensus rules nor deploys arbitrary smart contracts.

## Implemented route (flag disabled by default)

`POST /api/v1/egaas/internal-rail/prepare`

- Only accessible when the trusted application passes `counterpayInternalRailEnabled: true` at server construction, and the existing NEOpass resolver accepts the request.
- Accepts exactly `{ "entries": [{ "recordRef": "<random UUID v4>", "recordClass": "COURT_FILING", "privacy": "RESTRICTED", "commitment": "<64 lowercase hex salted digest>" }] }`.
- Record classes: IDENTITY, COURT_FILING, CALL_LOG, PROPERTY, MEDICAL, GOVERNMENT_REGISTRATION, AGENT_WORK, FINANCIAL_INTENT, EDUCATION, GENERAL. Medical, identity, call logs and financial intents require HIGHLY_RESTRICTED.
- Refuses extra metadata, private records, duplicate refs or commitments, oversize batches and failed anchor contracts.
- Returns only a prepared Merkle root, per-record offline proof references and explicit `verified: false`, `transactionId: null`, `broadcast: false`, `payment: false`, `signing: false`, `walletIssuance: false`, `vmExecution: false`.
- No endpoint to approve/submit a broadcast. No keys, wallet creation, storage, funding, or production side effects.
- Request bodies are bounded to 64 KiB; results are no-store and carry no access-control wildcard. Authenticated endpoint must additionally receive CSRF and origin protections through trusted application gateway before any production use.

## Critical next gates

- Rebase after PR #1346 is accepted, then run the full eGaaS API suite and review the NeoMask origin permissions.
- Run HTTP acceptance against actual HTTPS staging and verify real cryptographic proofs; ten local tests on the isolated module passed but were stubbed for the trusted anchor.
- Finish private persistent registry and encrypted custody/restore. Add signed, authenticated append-only audit evidence and retention/erasure policies. Access to medical, call logs, identity, financial, and education content requires specific legal/privacy controls.
- Test agent address control without accessing or copying signing secrets. Require per-agent limits, explicit authorized signer, revocation, anti-replay and reconciliation.
- Verify the `counterpay.holytemples.org` ChatGPT Sites source/hosting binding, independent Bitcoin node headers/inclusion and Counterparty parser agreement. Never treat a public API being up as proof of issuance, settlement or legal recordation.
- Require domain-specific legal validation for official filings, governmental registrations, real-property title, court documents and medical records. Blockchain anchoring alone does not establish legal jurisdiction, government authority, title, or regulated financial permission.

## Test report

Local tests: `node --test server/neo-platform-api/counterpay-internal-rail-*.test.mjs` in an isolated working copy: 10 passed, zero failed. `node --check` passed for core and HTTP files. GitHub CI and HTTPS staging have not been run for this branch. No on-chain transaction was sent.
