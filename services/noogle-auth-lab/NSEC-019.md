# NSEC-019 WebAuthn verifier adapter (review gate)

Added `webauthn_adapter.py` using the open-source Python `webauthn` verifier library. It pins the relying party to `connect.holytemples.org`, the HTTPS origin, and requires user verification. Do not confuse the mock-based adapter tests with actual authenticator signature integration tests.

Requirements: `pip install 'webauthn>=2,<3'`. CI currently does not install this dependency; the new test file is not yet executable in CI without dependency installation.

**Integration remains blocked:** WebAuthn credentials must be generated with trusted server-issued challenges and atomically verified/consumed, stored as bytes safely, and checked against owner-scoped credential records. Persist a successful assertion's updated counter transactionally. Support backup-state policy and compatible counter semantics. Enable sessions only after a verified assertion. Authentication endpoints must also use CSRF safeguards, secure cookies, rate limits, HTTPS, audited revocation and error handling.

No API server, Android APK update, remote terminal, or DNS deployment was performed. Verification functions are architecture adapters and are not exposed as production endpoints.
