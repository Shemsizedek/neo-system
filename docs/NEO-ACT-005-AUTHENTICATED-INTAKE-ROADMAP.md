# NEO-ACT-005 — Source export intake and draft risk dashboard contract

**Status: code committed for review, not an authenticated connector or live dashboard.**

The offline intake contract accepts only explicitly authorized, read-only export envelopes: CES, Counterparty, Crown Chain evidence and Treasury. It produces reproducible SHA-256 batch digests for change detection and a minimal dashboard response with balances classified under the existing ACT-004 rules, exception counts, and source manifests. A hash is not a cryptographic signature or proof of provenance. Do not include wallet secrets, identity numbers or unrestricted customer records in public dashboards.

## Control boundaries
- Authorization is an export assertion, **not** verified RBAC or authenticated API access.
- Source identifiers are scoped to source + batch + record ID; imported data is untrusted until independent verification.
- Asset and liability inclusion uses ACT-004 flags and is subject to independent evidence review.
- No fiat equivalents for internal V-Dollars or NEO bond face values without price discovery and legal obligations analysis.
- No transaction sending, token issuance, key access, remote connectors, storage or deployment.
- Display only redacted source manifests and aggregate exception counts to authorized viewers.

## Next gate: ACT-006
Implement controlled ingestion with authenticated principals, signed immutable evidence manifests, schema/denomination normalization, independent Bitcoin/Counterparty verification, trusted market pricing, API authorization tests and protected dashboard delivery. Run local and CI tests before merge.
