# NEO-BMI-005 — NEO Scan Bitcoin Evidence Gateway
Status: draft, read-only, preproduction. Public deployment and real node integrations are NOT enabled.
Use `createEvidenceGateway` with operator-configured Bitcoin Core and Counterparty adapters from BMI-004. `GET /health` and `GET /v1/evidence?asset=...&txid=...` return JSON. No wallet operations, remote signing, credit origination or market orders.
The `allowedAssets` restriction defaults to empty; external callers must not be granted arbitrary asset verification access by accident. Expose only behind authenticated private networking and add durable user-based rate limiting, source attestation, and replayable audit records before deployment.
A response `PROVIDER_EVIDENCE_CORRELATED` represents provider-reported correlation, NOT independent Counterparty consensus verification, legal ownership, secured interest perfection, proof of reserves or market eligibility.
Required follow-up: controlled bitcoin-core node in a private network; verified Counterparty parser; chain reorg rescans; authentication; PostgreSQL audit storage; CI execution; NEO Scan UI.
Tests: `node --test server/neo-bmi/gateway.test.mjs`. A separate local mock-provider run was successful. Actual GitHub CI status is not established.
