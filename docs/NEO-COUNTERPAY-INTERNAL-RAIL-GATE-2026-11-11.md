# Project 144 — Counterpay internal eGaaS rail (Gate 1)

## Verified operating context, 2026-11-11
- WordPress-managed `counterpay.holytemples.org` DNS CNAME targets `custom-domains.chatgpt.site.` with site-verification records. This establishes DNS configuration, not source deployment or protected Sites runtime access.
- Connected Render account's **NEO workspace** contains separate NEO Core/Counter staging and NEOpay retail staging services, none verified as the protected Counterpay wallet itself.
- This branch is stacked on eGaaS custody/anchor-readiness PR #1346, not main. Existing agent wallet proposals are isolated in PR #1380. New Counterpay wallet-creation UI resides in PR #1408. These are integration dependencies, not deployed or merged guarantees.
- The original eGaaS anchor constructor in PR #1346 already prepares a Merkle root of opaque commitments with signing and broadcast disabled. Reuse it rather than introducing another root algorithm or new blockchain.

## Layer contracts
1. **NEOpass:** authenticates a human or service identity. Authentication does *not* grant legal identity, government authority, blockchain address control, financial spending, or publication permissions.
2. **eGaaS private custody:** encrypted records and random nonces stay in a separately authorized storage system. Clinical data, personally identifiable identifiers, property/court documents, call content and raw filenames must never be placed in Bitcoin transactions, Counterparty broadcasts, public logs, URLs, or wallet labels. Retain the private nonce and canonical record in the protected vault for later verification; hashes of predictable documents alone can leak information by dictionary attack.
3. **Counterpay internal rail:** creates only an *offline prepared* batch of already-salted 32-byte SHA-256 commitment strings. Accepts random UUIDv4 record references and coarse classification; never record contents. Per-record receipts are returned to an authorized caller and belong in access-controlled storage, not public channels.
4. **NEO Crown Chain:** logical application evidence register over Bitcoin/Counterparty. A prepared Merkle root is not itself Bitcoin-anchored or legally authoritative.
5. **Bitcoin/Counterparty:** an approved, separately implemented publisher can propose a protocol-compatible payload after cost/budget review. Bitcoin transactions require fees; dust/uniqueness rules do not make a unique satoshi or legally recognized record. Prefer one Merkle root per bounded batch over one transaction per record. Verify block inclusion, chain continuity, confirmations, and independent Counterparty interpretation before receipt status changes.
6. **NeoMask:** origin-scoped external self-custody/hardware signing boundary with explicit Guardian risk assessment and an authorized operator confirmation. No private keys reach the server or source control.
7. **Agents and workers:** use unique authorized public address *bindings* and per-task scopes; wallet address possession never grants NEOpass permissions. A service bot wallet requires custody design, budgets, allowlists, approvals, replay protection, rotation/revocation and audit. Do not create market activity or artificial trading volume to mimic organic demand.
8. **BVM/NVM:** reserved for sandboxed deterministic computation such as document-policy validation, local notarization rules, workflow state machines, Merkle proof verification and signer-independent simulations. Never treat NVM as Bitcoin consensus or a deployed smart-contract runtime.

## API — preparation only
`POST /api/v1/egaas/internal-rail/prepare`
- Off by default. The existing eGaaS server is wired with `counterpayInternalRailEnabled=false` unless a trusted caller explicitly opts in to synthetic-only staging.
- Requires the server-provided trusted NEOpass subject resolver, `application/json`, and a body of at most 65,536 bytes.
- Body exactly `{"entries":[{"recordRef":"<random uuid v4>","recordClass":"COURT_FILING","privacy":"RESTRICTED","commitment":"<64 lowercase hex chars>"}]}` (one to 128 entries). Allowed classes: IDENTITY, COURT_FILING, CALL_LOG, PROPERTY, MEDICAL, GOVERNMENT_REGISTRATION, AGENT_WORK, FINANCIAL_INTENT, EDUCATION, GENERAL. IDENTITY, CALL_LOG, MEDICAL, FINANCIAL_INTENT require HIGHLY_RESTRICTED.
- The handler rejects extra fields to reduce accidental transmission of sensitive source records.
- Returns per-record proof data, a batch commitment root, and explicit `prepared_offchain`, `verified:false`, and null transaction ID.
- No database persistence, payment logic, wallet issuance, signing, broadcast, VM execution, Bitcoin wallet calls, or trusted publication proof can be reached through this endpoint.

## Required next gates
- Deploy **separate HTTPS staging** through an explicitly mapped, verified source and perform browser/mobile create/restore tests against standard BIP39 vectors. Do not redirect the existing Counterpay CNAME or claim that the separate NEOpay preview is Counterpay.
- Harden PR #1408 before live wallet creation: independent cryptographic vectors, pinned/bundled dependencies, strict CSP and XSS review, recovery and key lifecycle audit.
- Review and integrate PR #1346 custody/receipt proofs, and PR #1380 service-account public address proposals. Validate authoritative NEOpass scopes and persistent access-controlled records.
- Add independently verified Bitcoin and Counterparty inclusion proof consumption only after its separate security review; no external spending or publication occurs in this gate.
- Implement privacy impact assessments, retention/deletion rules, healthcare/education/court data controls, and lawful registry integrations. Blockchain anchoring independently proves neither authenticity, title, jurisdiction, nor government registration.
- BVM/NVM execution and agent signing are *future interfaces*, not activated capabilities.

## Test and rollback
`node --test server/neo-platform-api/counterpay-internal-rail-core.test.mjs server/neo-platform-api/counterpay-internal-rail-http.test.mjs`

Locally executed 10 unit/HTTP tests on staged source copies: 10 passed, 0 failed. These exercise injected anchor fixtures, not end-to-end production credentials or live Bitcoin/Counterparty validation. Full server and dependency tests still require CI/repository checkout.

Rollback: do not set `counterpayInternalRailEnabled` on production; the route returns 503 by default. Revert the feature branch integration if required. No DNS, token, payment, or deployment change is part of this PR.
