# NEO-EFAX-016 — isolated staging validation and recovery gate

Scope: draft PR only, stacked on #1444 and #1442. No production deployments, fax transmissions, provider enrollment, payments, database migrations, or externally binding approvals.

## Verified in isolated local Node.js 22.16.0 environment
- 15 tests passed; 1 PostgreSQL integration test group skipped due missing isolated test database and missing pg driver.
- Loopback HTTP checks cover missing/invalid bearer token, explicit disabled capabilities, fax POST 503, and workflow intake/approval POST 503.
- The PostgreSQL opt-in integration suite refuses database names other than neo_efax_test or neo_efax_test_<suffix>. Its guard was exercised locally with a forbidden name and rejected it.
- The suite is committed, but NO real database results, real-transaction guarantees, concurrent-commit proof, backup restore, deployment health, or external provider status can be asserted.
- GitHub CI passed on parent PR #1444. CI evidence for this PR is separate.

## Northflank staging instructions (proposal, NOT deployed)
1. Create a fresh, isolated staging project only after confirming external provider access. Configure a Git-linked Docker build from the reviewed eFax branch. Dockerfile path: services/neo-efax/Dockerfile. Build context: services/neo-efax.
2. Restrict port 10000 to private ingress. Supply an isolated test NEO_EFAX_API_TOKEN via secrets management, not source or build args. Do not expose to the public or use production credentials.
3. Verify GET /health reports liveFaxEnabled:false and transport:unconfigured. Authenticated POST /v1/faxes, /v1/requests and /v1/approvals must all return 503; no real fax should be sent.
4. For database testing use a separate, strictly disposable PostgreSQL instance, **database named neo_efax_test**, plus the reviewed pg driver installed in the isolated test runner. Set NEO_EFAX_TEST_DATABASE_URL via encrypted runtime secrets and run:
   node --test services/neo-efax/postgres.integration.test.cjs
   Require all actual DB cases pass without skips. Suite creates a uniquely named temporary schema, tests transaction isolation, conflict resolution, audit rollbacks and then drops only that schema.
5. Separately rehearse a test-only backup/recovery exercise: take pg_dump of fixtures from dedicated test DB, restore into a **new disposable neo_efax_test_restore** database, verify request and audit counts and ordering, then remove artifacts according to a reviewed retention policy. THIS WAS NOT EXECUTED. Never point at production.
6. Require independent review of DB privileges, authentication claims, tenant controls, backup encryption, log redaction, secret rotation and audit tamper controls before staging approval.

## Open blockers
- Northflank account and deployment access not verified, no environment provisioned.
- PostgreSQL server/pg runtime not available in current local execution context, so DB suite skips.
- NEOpass trusted issuer verification and reviewer identity integration, notification routing and document custody are NOT wired.
- No carrier integration exists. Phaxio simulation is offline only. Explicit separate approval needed for any sending.
- Existing Vercel build-rate-limit failures are unrelated to certifying the eFax runtime.

Related: https://github.com/Shemsizedek/neo-system/issues/1441
