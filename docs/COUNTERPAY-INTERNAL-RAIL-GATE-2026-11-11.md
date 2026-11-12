# Project 144 — Counterpay Internal Rail / NEO eGaaS

## Scope and relationship to existing work

This gate extends the staged eGaaS anchor work in PR #1346 rather than introducing a separate blockchain, payment node, or custody system. The new internal preparation route is **disabled by default**. It does not perform payment, wallet issuance, signing, broadcasting, or VM execution. Its trusted dependency is the existing `prepareEgaasAnchor` Merkle commitment preparer, with authorization delegated to the existing NEOpass `subjectResolver`.

Counterpay is an intended internal Bitcoin/Counterparty transaction rail. NEO Crown Chain is the NEO application-level evidence and registry layer, **not** an independently verified consensus network. NeoMask is the intended origin-scoped signer and security boundary; service code must never receive private keys. NEOpass identifies authenticated actors, and NEO Guardian supplies risk policy. The previous agent-wallet Gate 1 in PR #1380 is a pending, noncustodial public-address proposal register, not a funded-wallet issuer.

## Intended architecture

1. Sensitive source data, including patient records, call logs, court submissions, identity documents, and property records, remains in access-controlled encrypted off-chain custody with retention rules and auditing. Do not store raw records, plaintext identifying data, predictable unsalted hashes, encryption keys, or identifying metadata on Bitcoin/Counterparty.
2. Trusted custody computes distinct 256-bit random-salted record commitments and stores the salt securely with the encrypted source record. **The API accepts commitments only**; it cannot prove callers used secure random salts. Commitments alone may still create correlation risks, and authorization is required for any publication.
3. An authenticated eGaaS service submits 1–128 unique commitments with non-identifying random record references and coarse classifications to `POST /api/v1/egaas/internal-rail/prepare`.
4. The endpoint calls the existing eGaaS Merkle preparer, returns a shared root and individual membership proofs, and explicitly marks records `prepared_offchain`. This is not Bitcoin confirmation or legal filing evidence.
5. Future anchoring, subject to separate approvals and fee controls, will use an operator-approved wallet via NeoMask to sign a verified Bitcoin/Counterparty transaction carrying only a suitable compact batch commitment. Bitcoin ledger height and transaction inclusion must be verified independently, with confirmation/reorganization handling. Existing eGaaS inclusion verification is still a staged dependency; no anchor is published by this gate.
6. Separate records track evidence source, authorization, filing acceptance, signatory authority, custody, timestamp provenance, payment finality, and other legal/compliance status. A Bitcoin transaction does not itself create statutory registration, title, judicial authority, government recognition, protected-health compliance, or legal service of process.

## API contract

Route: `POST /api/v1/egaas/internal-rail/prepare`

Application parameter: `counterpayInternalRailEnabled`, default `false`; not an environment setting and not automatically enabled.

Body example, **synthetic values only**:

```json
{
  "entries": [
    {
      "recordRef": "11111111-1111-4111-8111-111111111111",
      "recordClass": "COURT_FILING",
      "privacy": "RESTRICTED",
      "commitment": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  ]
}
```

Rejects unknown body/entry fields, duplicate references/commitments, invalid hashes, unsupported classifications, insufficient privacy classifications, oversized requests, missing NEOpass identity, and non-JSON input. A `200` response means **preparation only**. By default the route returns `503 internal_rail_preparation_disabled`.

### Caveats before enabling even the preparation route

- The trusted subject resolver authenticates identity, but this gate does **not** implement role/scope authorization, per-user record ownership, persistent audit, throttling, fraud detection, deletion governance, or durable storage. Keep `counterpayInternalRailEnabled = false` until explicit role and ownership checks are integrated.
- Prototype receipt references and record classifications must remain internal: even category metadata can be sensitive.
- The future evidence store must prove commitment-to-encrypted-source linkage, provenance, authorized submitter, custody integrity, and record retention. The present route stores nothing.
- No wallet generation or recovery is covered here. PR #1408 still requires independent BIP39 test vectors, browser HTTPS/security checks, supply chain review, and protected Counterpay runtime binding.
- Bitcoin has miners' timestamps with limited precision and economic costs; batching avoids a separate dust transaction per record. No amount of BTC marks a document as legally filed, validated, or officially registered.
- **BVM/NVM proposal only:** deterministic policy execution and proof verification in a separately audited, restricted compute layer. No arbitrary transaction signing, chain VM execution, or automatic statecraft powers without validation.
- Separate operational approvals are required for external payments, issuance of tokens, automated financial activity, cryptocurrency transfers, securities activity, clinical records, public-sector claims, and key management.

## Hosting evidence, November 11, 2026

- WordPress DNS for `counterpay.holytemples.org` has a CNAME to `custom-domains.chatgpt.site.` and associated verification records. **Counterpay frontend hosting target is ChatGPT Sites, not the Render NEOpay staging site.**
- Render's `NEO workspace` has `neopay-retail-staging` at `https://neopay-retail-staging.onrender.com` and `neo-counter-render-staging` at `https://neo-counter-render-staging.onrender.com`. These are different builds/services; the current Counterpay Sites source/runtime mapping is **not** verified by DNS alone. Render services are not a substitute for confirming Counterpay's protected Sites deployment.
- Existing PR #1346 reports prior Counterpay bridge/node read-only evidence, but does not establish current live signing, canonical Counterpay code deployment, or production mainnet broadcasting.
- No DNS, WordPress, Render service, payment status, or production configuration changed in this gate.

## Test and next gates

Tested local source copies with `node --test server/neo-platform-api/counterpay-internal-rail-*.test.mjs`: 10 passed, 0 failed; `node --check` succeeded for both new implementation modules. Tests use a fake anchor preparer to isolate integration expectations; they are not end-to-end proof verification, privacy certification, cryptographic validation, or HTTPS staging tests.

Next gates:
1. Ensure the staged eGaaS parent branch and new PR are reviewed. No automatic merge or deployment.
2. Verify `counterpay.holytemples.org` current Sites runtime and the implementation of PR #1408 on an actual HTTPS test host, with nonfunded test wallets only.
3. Introduce service/record ownership authorization, rate limits, durable private custody, encrypted audit trail, nonce-salted commitments, identity-to-wallet binding and evidence state machine.
4. Verify approved NeoMask signer connection and transaction review independently, then only propose a restricted anchoring broadcaster with spending caps, batching, independent Bitcoin/Counterparty verification, and rollback handling. Keep live signing/fees/broadcast off until all gates pass.
5. Define optional NVM/BVM bytecode/contract sandbox and deterministic proof validation without custody authority or live financial execution.
