# NSEC-111 — One-Use Approval Execution (inactive)

This is a transaction contract and test suite, not a live device-management feature.

- An authenticated NEO Pass session and a verified WebAuthn assertion must bind the account, credential, exact action, device ID and any requested new name.
- `verifyApproval` must load a server-authored durable approval; the submitted opaque token must not be treated as truth.
- A PostgreSQL transaction consumes the approval, updates the matching account-owned device, records an audit event, and commits; failures roll back together.
- Approvals must be issued only after verifying an action-bound WebAuthn challenge, with short expiry, session revocation checks, user verification and rate limiting.
- The database migration must be reviewed and applied before integration. Run real PostgreSQL concurrency, race, expiration, rollback and crash-recovery tests before deployment.
- The test database is mocked. No production or Render database, NEO Pass secrets, enrollment, signing, voting or terminal privileges are connected.
