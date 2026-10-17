# NSEC-112 — PostgreSQL approval concurrency certification

This is an **opt-in test harness**, not an assertion that real PostgreSQL certification has passed.

Render workspace had **no PostgreSQL instances** when inspected on October 15, 2026. Do not use live Noogle, NEO Pass or production databases for this test.

Run only after provisioning an isolated disposable PostgreSQL database with schema migrations `001_devices.sql`, `002_challenges.sql`, `005_device_approvals.sql`. The root repository does not need new runtime dependencies; install `pg` into an isolated test environment first.

```bash
NOOGLE_ALLOW_DB_INTEGRATION=yes NOOGLE_TEST_DATABASE_URL='<isolated_test_postgres_uri>' node --test deploy/noogle-render/approved-device-postgres.integration.test.mjs
```

Test contract: competing approval transactions must produce exactly one successful device rename, exactly one audit row, a rejected duplicate, and rejected subsequent replay. Test data is uniquely namespaced and removed in cleanup. Run fault injection and interrupted-connection tests before deployment, including a real revocation flow and expiry tests. Never point the test at a production database.

The `verifyApproval` callback in this fixture is intentionally mocked. Passing this test **does not** certify NEO Pass, WebAuthn, user verification or enrollment.
