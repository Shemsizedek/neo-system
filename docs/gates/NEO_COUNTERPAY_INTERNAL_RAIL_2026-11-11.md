# Project 144 — Counterpay internal rail and NEO eGaaS (staging gate)

## Verified hosting evidence (2026-11-11)
- WordPress.com DNS for `holytemples.org`: `counterpay` CNAME targets `custom-domains.chatgpt.site.`; this is a **ChatGPT Sites** custom-domain target, not Render.
- Existing Render **NEO workspace** (`tea-db8bbpij9qps73cb7gb0`) includes `neo-counter-render-staging`, `neopay-retail-staging`, and `neo-core-staging`. Neither is verified as the actual `counterpay.holytemples.org` hosting runtime. Render build/configuration evidence is not a live site acceptance test.
- The actual Counterpay Sites source and protected runtime binding remain unverified. There is no permission to infer that a file in `public/neopay` is automatically served by the Counterpay domain.
- This code deliberately builds upon unmerged [eGaaS custody/anchor PR #1346](https://github.com/Shemsizedek/neo-system/pull/1346), so **do not merge this branch against main independently**; reconcile the parent PR first. Agent wallet PR #1380 and wallet issuance PR #1408 are separate, unmerged dependencies.

## Roles and boundaries

1. **Counterpay internal rail:** an orchestration interface for internal payment intents and audit evidence. This initial module implements **no value transfer**: it prepares a record-commitment batch only.
2. **NEO eGaaS / private record custody:** all actual records, names, identifiers, medical information, case files, call-log data, property documents and personnel metadata must stay in an authorized encrypted, access-controlled records system. Nothing submitted to this new endpoint may be a raw record or unsalted identifier.
3. **NEO Crown Chain:** application layer for mappings and evidence receipts. A locally prepared Merkle root is not a Bitcoin timestamp, ownership proof, verified court filing, government registration or legal recognition.
4. **Bitcoin and Counterparty:** public layer *only when separately approved and proven*. Broadcasts consume fees; no arbitrary dust-value outputs or one-transaction-per-record policy. Favor batching precommitted leaves. On-chain data cannot be retracted. There is no unique BTC-denominated intrinsic value per document; a BTC output is not the content identity.
5. **NeoMask:** origin-scoped wallet connection, device-controlled signer, Guardian checks and user review. No key material crosses app/server boundaries. Real signing disabled in this gate.
6. **NEOpass:** trusted user/service identity and roles, not simply presence of a Bitcoin address. Production roles and approval scopes must be verified.
7. **Agents/bots/workers:** bind a *public* address to an authenticated, approved principal through a challenge signature and durable register. Existing PR #1380 is read-only and cannot yet prove wallet control. Workers must never gain spending authority merely by completing a job.
8. **BVM / NVM:** possible deterministic off-chain execution/validation engines, but **no VM is deployed** in this gate. Propose restricted Bitcoin-compatible transaction policy verification, record validation, consent/retention workflow state machines and proof verification. VM execution must be sandboxed, metered, versioned and separately reviewed before use.

## This change
- `counterpay-internal-rail-core.mjs` validates a bounded list (1–128) of entries with only four fields: random record reference (UUIDv4), record classification, privacy classification and a precomputed 32-byte salted commitment represented in hexadecimal.
- Reuses existing `prepareEgaasAnchor()` from PR #1346; outputs Crown Merkle root, membership proofs and a **candidate** Counterparty text field.
- Every receipt is explicitly `prepared_offchain`, without a txid, block hash, confirmations or chain verification. The only possible operations flags are all `false`.
- `POST /api/v1/egaas/internal-rail/prepare` is guarded by a trusted NEOpass subject resolver and the separate `counterpayInternalRailEnabled` server option, which defaults to `false`. No persistence, wallet issuance, signing, payment or broadcast handler is added.
- Rejection responses do not echo submitted data. Rate limiting, authenticated per-record authorization and private durable audit storage remain prerequisites before exposed staging enablement.

### Preparation request shape (TEST DATA ONLY)
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
The example hash is an **invalid real-world commitment** (fixed fixture) and must not be used for actual private records. An upstream trusted custody service must produce random nonces and domain-separated, salted commitments without leaking identifying metadata; the private record, nonce and link to the commitment must be stored encrypted off-chain. Mere SHA-256 of a name, phone number, or patient ID remains vulnerable to enumeration.

## Record lifecycle
`PRIVATE_CAPTURED` (custody service) -> `PREPARED_OFFCHAIN` (this module) -> `APPROVED_FOR_ANCHOR` (separately gated) -> `BROADCAST_SUBMITTED` (separately gated) -> `BITCOIN_INCLUDED` -> `CONFIRMED_AND_VERIFIED` (Bitcoin Core proof + independent Counterparty readers) -> `RECONCILED`.

Only preparation is implemented. Proving inclusion, verifying legal signature authority, setting fees, signing, and broadcasting are intentionally absent.

## Tests, limits, and next gate
- Locally ran `node --test server/neo-platform-api/counterpay-internal-rail-{core,http}.test.mjs` against an isolated module copy: **10 passed, 0 failed**.
- HTTP tests cover disabled-by-default, missing NEOpass identity, valid preparation, invalid media/body, forbidden personal data, no reflected private content and request-size bounds.
- These tests use a stubbed anchor preparer. Real branch integration, full-platform tests, staging HTTPS acceptance, root-proof verification with actual upstream records, dependency pinning, and security reviews remain **unverified**.
- Do not enable `counterpayInternalRailEnabled` on an internet-facing service without rate limits, scoped authorization, private durable audit, security tests and review.
- Do not activate wallet issuance, asset issuance, payment transfers, or bitcoin broadcast; the new internal rail does not need BTC funds to run.

**Next gate:** reconcile parent eGaaS PR #1346 with this branch, validate the entire test suite, establish a verified private HTTPS staging target, test one synthetic GISD and one synthetic court-filing proof end to end without network broadcast, then review scoped NeoMask agent-wallet enrollment and independent Bitcoin proof verification.
