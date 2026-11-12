# Project 144 — Counterpay Internal Rail for NEO eGaaS

## Integration decision

Counterpay is NEO's proposed Bitcoin/Counterparty financial transaction rail. NEO Crown Chain is the application-level evidence and audit layer. NeoMask is the origin-scoped, noncustodial signer; NEOpass authenticates humans and services. Bitcoin is a public settlement and anchoring layer, **not** a confidential records database or an authorization to act as a government, bank, court, or land registry.

The existing eGaaS anchor preparer (`server/neo-platform-api/egaas-anchors.mjs`) is reused by the internal rail (`counterpay-internal-rail-core.mjs`). This change is intentionally stacked on PR #1346, whose eGaaS foundation has not been merged. Agent-wallet proposal gate #1380 and wallet creation PR #1408 are independent, unmerged dependencies. No new chain, wallet custodian, or replacement Bitcoin node is created.

## Hosting verification

- WordPress.com DNS for `counterpay.holytemples.org` points to `custom-domains.chatgpt.site` (ChatGPT Sites). This is **not** the existing Render NEOpay staging host.
- Render's confirmed **NEO workspace** contains `neopay-retail-staging.onrender.com`, which tracks an older `feat/neopay-ux-001-retail-preview` branch. No wallet issuance deployment or browser E2E test was performed in this gate.
- The protected source/runtime binding for the ChatGPT Sites Counterpay wallet and its authority to issue wallets remains **unverified**. DNS alone does not establish application-source parity. Do not edit production DNS based on this gate.

## Architecture

`Private record (encrypted, access controlled) -> random salt and domain-separated SHA-256 commitment in trusted custody -> authenticated commitment-only eGaaS API -> existing Crown Merkle batch -> prepared offline root -> future separately authorized NeoMask/Guardian review -> optional Counterparty/Bitcoin broadcast -> Bitcoin inclusion and Counterparty parser verification -> verified Crown receipt`

Prohibit public posting of raw record contents, unkeyed predictable hashes of identities/medical/court records, phone numbers, property addresses, medical data, identifiers, or recovery phrases. Merkle inclusion proves that a committed value belongs to a batch, not the accuracy, legal validity or governmental recognition of the record. Bitcoin block timestamps are coarse consensus evidence, not exact event or filing times. A transaction's satoshi value is not itself a unique record identifier: use domain-separated commitments plus the transaction reference, index, and membership proof. Batch multiple records to avoid unnecessary fees, dust, and blockchain bloat.

## What is implemented here

- A strict commitment-only internal batch builder for `IDENTITY`, `COURT_FILING`, `CALL_LOG`, `PROPERTY`, `MEDICAL`, `GOVERNMENT_REGISTRATION`, `AGENT_WORK`, `FINANCIAL_INTENT`, `EDUCATION`, and `GENERAL` record classifications.
- Opaque UUIDv4 references, validated SHA-256 commitments, duplicate prevention, mandatory high sensitivity for identity/call log/medical/financial classes, and max 128 commitments per batch.
- Each prepared receipt contains a Merkle membership proof and an explicit **prepared_offchain** status. No false Bitcoin confirmation or court/registry authority claims are made.
- An authenticated HTTP preparer at `POST /api/v1/egaas/internal-rail/prepare`. The route is disabled by default, requiring the existing trusted NEOpass subject resolver and `counterpayInternalRailEnabled: true` only for explicitly controlled staging.
- No wallet signing, agent funding, token issuance, transaction construction, broadcasting, storage, real record ingestion, VM execution, or new spending.

## NeoMask and agent-wallet interfaces — next integration

NEOpass identity -> agent/worker authorization -> durable wallet binding with signed proof of control -> origin-scoped NeoMask permissions and NEO Guardian decision -> capped, policy-scoped PSBT or Counterparty request -> device-local/hardware signing -> verified chain receipt. Agent public addresses do not themselves confer identity or financial authority. Enforce budgets, approved destinations, per-agent spend permissions, replay protection, nonce management, revocation/rotation, escrow and monitoring. Do not store private keys in worker prompts or GitHub.

**BVM / NVM:** defer to a separate deterministic application execution layer for policy evaluation, workflow transitions, receipts, and testable contract logic. It is **not** a Bitcoin consensus virtual machine or an on-chain smart-contract capability by declaration. State machines must not act on unverified transactions or create legal effects absent recognized authority.

## Verification and activation gates

- Local checks performed: `node --check` core and HTTP module; `node --test server/neo-platform-api/counterpay-internal-rail-*.test.mjs`: **10 passed, zero failed** (Node 22 local harness, fixture crypto; module itself requires no new cryptographic dependency).
- A complete repository build/test and an HTTPS end-to-end test were **not** performed in this environment. The remote repository is accessed via GitHub connector; direct git clone is unavailable here.
- Before merge: run Node 24 CI, existing eGaaS tests, verify parent PR #1346 and its dependencies, test genuine Merkle membership with trusted Crown preparer, test authentication and reject header impersonation, add request rate limits and operator audit telemetry, confirm storage and privacy retention policies.
- Before any live wallet use: finish PR #1408 recovery/crypto/security review and confirm the actual protected Counterpay Sites runtime, HTTPS origin/CSP and NeoMask compatibility.
- Before broadcasting: authorize an exact root and intended policy, verify wallet control, ensure legal/privacy review, fee limits, full Bitcoin inclusion + independently corroborated Counterparty parser results, chain reorg behavior, and receipt lifecycle. Remain disabled until then.

## Next gate

Verify protected Counterpay hosting/source parity and test the wallet issuance branch on HTTPS staging. Then integrate persisted authorized agent wallet bindings and end-to-end synthetic commitment/receipt tests. All payments and token issuance remain disabled.
