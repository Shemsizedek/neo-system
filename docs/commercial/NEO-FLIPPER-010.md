# NEO-FLIP-010 — Signed-token loopback HTTP rehearsal

**Principal:** Shelton Estate & Co. **Parent:** NEO Deal Desk / NIA-013.
**Scope:** isolated, synthetic HTTP verification; no publicly exposed service, real buyers, offers, signatures or money movement.

## Test artifact
`server/neo-flipper/gate10-http-flow.test.mjs` starts an ephemeral Node HTTP server bound exclusively to `127.0.0.1` on a random local port, invokes the actual `createFlipperGate5HttpHandler` and `createFlipperGate5` service layer, and authenticates with `createGate6NeopassVerifier` using test-only HS256 tokens.

The in-process record store, identity membership/revocation service, buyer attestations, source rights, and match provider are **synthetic doubles**. No database URL or live identity issuer is embedded. Test data use synthetic buyer and property identifiers and fabricated evidence refs.

## Acceptance scenarios
1. Missing and forged JWTs and insufficient scopes denied.
2. Synthetic opt-in buyer registration and redacted buyer summaries.
3. Repeated idempotency key and changed-payload conflict.
4. Expired listing rejected; current synthetic listing accepted.
5. Research-only buyer/property preview with zero recognized revenue.
6. Matcher outage fails the whole preview instead of returning partial results.
7. Buyer suppression removes buyer from eligible pool and subsequent matches.
8. Revoked token, oversized request body and unknown route rejected.
9. Minimal audit and preview responses omit raw identity, banking and contact fields.

Run `node --test server/neo-flipper/gate10-http-flow.test.mjs` and `node --test server/neo-flipper/*.test.mjs` in Node 24. Dedicated GitHub Actions workflow `.github/workflows/neo-flipper-tests.yml` executes these tests when committed.

## Evidence boundaries
- Existing Gate 9 scratch branch `br-holy-lab-ar0at3wz` has a verified restricted `neo_flipper_gate9_app` login with real SQL inserts and no test record contamination of parent staging.
- **This Gate 10 test is HTTP → actual application code → in-process mock store, not HTTP → real Neon PostgreSQL.** Full production-grade issuer, database credential management, branch attestation and provider contracts remain unconnected.
- Do not use a mock issuer as a substitute for a real signed-in NEOpass identity; production requires verified issuer custody, access control, session revocation and provider attestations.
- No external POST or paid services are used. No merge/deployment.

## Next release dependency
Securely provision approved stage-only runtime secrets and a verified issuer/membership/revocation provider, then run the same API scenarios against the real restricted Neon scratch branch. Validate actual concurrent database locking/idempotency, recovery, alerting and access controls before any live commercial workflows.

**Keep PR #1443 draft and unmerged.** No production changes or external commitments.
