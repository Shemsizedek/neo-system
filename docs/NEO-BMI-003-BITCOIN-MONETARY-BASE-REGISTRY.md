# NEO-BMI-003 — Bitcoin Monetary Base & Secured Credit Registry (staging)
Policy: BTC is the NEO monetary base; XCP/Counterparty is a distinct Bitcoin-anchored asset protocol. A Bitcoin-native issuance is not a representation issued on a separate L1. This NEO economic preference does **not** establish statutory priority or make non-Bitcoin assets fraudulent.

## Read-only gate
- `registry.mjs` prepares deterministic provenance and secured-claim evidence records.
- `verifyIssuance` accepts injected, independently controlled Bitcoin and Counterparty read-only verifiers, and checks txid/asset correlation and confirmation indication. A single provider response is **not** SPV, consensus, or full-node verification; production deployment must independently validate Bitcoin consensus and Counterparty parsing before promoting statuses.
- Status `CHAIN_EVIDENCE_MATCHED` is deliberately **not** asset authenticity, proof of reserves, issuer authorization, or perfected collateral.
- Never infer enforceable security interests from hashes alone. Document agreements, debtor identity, applicable law, perfection, priority, liens, and independently verified reserves separately.
- Cross-chain wrapped and synthetic assets receive accurate classes with risk disclosures, not automatic fraud findings.

Run: `node --test server/neo-bmi/*.test.mjs`. No issuing, signing, custody, payments, trading, chain-writing, production deployment or public listing enabled.

Source: Executive Order March 6 2025, Strategic Bitcoin Reserve, Sections 1–5. It separates BTC reserve assets from the other digital asset stockpile; it does not grant XCP statutory reserve status or perfect private claims.
Next: Connect independent Bitcoin Core and Counterparty read-only verifiers; add reorg handling, issuer signature proofs, immutable source evidence, dispute workflows, and PostgreSQL retention.
