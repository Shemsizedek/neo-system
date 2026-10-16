# NTEL-009 — NeoTele operator evidence and pilot funding dashboard contracts

Committed pure funding ledger calculations and an adapter-driven document evidence registry with approval separation. Proposed financial figures have evidence reference identifiers; **these are not bank balances, funded deposits or confirmed provider payments**.

The evidence registry keeps SHA-256 document digests, reviewer identity and decisions through injected storage/audit adapters. Current adapter contract is not yet transactional and has no authenticated operator-role enforcement; these must be implemented before deployment. A caller-supplied independent-check flag is not itself proof of independent verification. Real documents should be verified against counterparties and retained in restricted Crown Chain Evidence Vault, not the public repository.

Next: NTEL-010 bind authenticated roles, immutable persistence, atomic audit/outbox, real provider diligence documents and dashboard. No live eSIM issuance or Lifeline-funded subscriptions have been activated.
Tests: `node --test server/neotele/*.test.mjs`.
