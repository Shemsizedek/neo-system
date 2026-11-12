# Project 144 — Counterpay Internal Rail / NEO eGaaS Gate

## Purpose and ownership
Counterpay is the intended common Bitcoin/Counterparty transaction interface for NEO business applications and the eGaaS record-commitment system. NEO Crown Chain organizes independently verifiable evidence and manifests. NeoMask is the permissioned, device-local signing boundary; NEOpass authenticates operators and workers. The BVM/NVM remains a separate, untrusted-by-default computation sandbox, not a settlement network or authority.

## Verified as of 2026-11-11
- WordPress DNS for `counterpay.holytemples.org` contains a CNAME to `custom-domains.chatgpt.site`. That establishes DNS configuration, **not** access to, or runtime verification of, its separately hosted source.
- Two Render workspaces are visible: `NEO workspace` and `NEO SYSTEM`. The former has NEO staging services, including `neopay-retail-staging`, which is a *different* app and branch. No existing Render Counterpay wallet issuer staging mapping was verified.
- Existing eGaaS prototype work is in PR #1346 (`feat/egaas-bitcoin-anchor-preparation-20261107`). Existing agent wallet proposal work is PR #1380. BIP39 wallet creation is draft PR #1408. All are independent and unmerged; this branch starts from #1346 to reuse its salted-Merkle batch preparer.
- Existing NeoMask provider API is in `apps/neomask-extension/rpc.js`. A visible signer interface does not demonstrate tested live signing.

## What this branch implements
- Reuses `prepareEgaasAnchor` from PR #1346. No parallel Bitcoin node, new chain, or new cryptographic signing implementation.
- Adds a strict, opaque, *offline-only* internal record batching interface with receipts for: identity, court filing, call logs, property, medical, government registration, agent work, financial intent, education, general.
- Inputs are strictly `recordRef` (random UUIDv4), `recordClass`, `privacy`, `commitment` (64 hex). No personal names, medical details, phone numbers, property descriptions, wallet keys or raw documents accepted. Caller must prepare strong random-salted commitments in private encrypted custody; this module does not salt input.
- Adds a NEOpass-authenticated `POST /api/v1/egaas/internal-rail/prepare` endpoint, disabled by default. It accepts <=128 distinct, high-entropy commitments, no storage. The endpoint is a computational preparation API, **not** publication, registration, filing acceptance, signature, or payment.
- A successful batch returns the existing Crown Merkle root, proof array, and candidate `NEO:eGAAS:1:<root>` text. No Bitcoin transaction is created, signed, broadcast or confirmed.
- Test module validates validation failures, privacy checks, default-disabled behavior, absence of signing/broadcast, and authentication gate.

## Chain-of-truth rules
1. Internal custody timestamp: server log only, subject to tampering and clock uncertainty.
2. Prepared batch: off-chain proof of consistent commitment computation.
3. Submitted transaction: txid is a network submission receipt, not confirmation.
4. Bitcoin inclusion: verified tx data, block hash, height, and confirmation depth required, including reorg handling. Counterparty payload claims require independently checked protocol parsing.
5. Legal status: separate validation from a competent external authority; on-chain timestamping alone cannot establish title, jurisdiction, medical provenance, valid court filing or government registration.

**Privacy:** even salted hashes can leak if combined with linkable metadata. Protect secret salts/nonces and identifying mappings in encrypted role-controlled storage, exclude raw records from chain and URLs, and apply data retention/deletion procedures. In particular, no health or identity data should be broadcast, including unprotected hashes of predictable personal data.

**Bitcoin economics:** no minimum-value output is required for a Merkle commitment; do not rely on unique satoshi amounts as records, because dust and transaction fees can be wasteful. Batch many private commitments and publish only a minimal permitted protocol payload after signing and funding review.

## Agent accounts and NeoMask
Use the already proposed worker account register (#1380) as the source for candidate public address bindings, not as proof of wallet control. NEO agents receive operator-reviewed, role-scoped wallet associations, expiration/rotation and spending limits; never automatically reveal or grant keys. Bind each spending intent to work evidence, asset/amount/destination, fees, nonce, permissions and explicit approval. No fabricated trade volume or simulated settlement presented as actual market activity.

## BVM/NVM scope
For the first sandbox, add deterministic policies for fee/risk checks, programmable approval logic, ledger reconciliation, registry schema validation, and proof verification. Execute off-chain in a resource-limited sandbox with auditable inputs/outputs. Do **not** represent this as a deployed Bitcoin consensus VM, an EVM, or a new legal jurisdiction.

## Test and security gates
- Local isolated module test result: **10 passing tests** under Node 22. This does not test source integration against the full repo, actual Merkle proof vectors, server routing, or HTTPS browser behavior.
- Run on approved Node 24 environment: `node --test server/neo-platform-api/counterpay-internal-rail-*.test.mjs server/neo-platform-api/egaas-anchors.test.mjs`; then run existing platform tests.
- Verify `counterpay.holytemples.org` actual source binding through ChatGPT Sites or authorized site management before claiming domain-to-source parity; do not repoint DNS.
- Verify wallet recovery on a dedicated HTTPS staging instance using disposable zero-balance test wallets, BIP39 vectors, and NeoMask origin permissions. PR #1408 currently depends on remote crypto imports; bundle and review dependencies before issuance.
- Add durable encrypted custody, authorized root approvals, independent Bitcoin RPC and two independently operated Counterparty readers, wallet-key and transaction intent controls, inclusion proofs, and monitoring before live broadcast.
- Keep payments, issuance, signing, broadcast, VM execution and privileged government actions disabled. Any real money movement and financial product launch requires separate compliance checks and explicit authorization.

## Milestone
Review this stacked PR with #1346, #1380, #1408. Next gate is an HTTPS isolated staging build that verifies record preparation and BIP39 recovery **without funding or broadcasting**.