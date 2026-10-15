# NSEC-106 — Atomic Device Enrollment, inactive

This is a code/test artifact only. It is **not wired to the staging HTTP server**, does not provision a database, and cannot enroll a device.

The transaction ensures that a consumed challenge and inserted device row commit or roll back together. The PostgreSQL active-key unique index rejects duplicates. A failure after a private proof is consumed requires **starting a fresh WebAuthn registration ceremony**, not replaying the consumed object.

**Critical blockers:** real NEO Pass issuer verification, audited WebAuthn registration, trusted generation of subject/origin/rpId/device fields and key hash, verified binding between proof publicKey and stored key hash, account-level rate limits, credential uniqueness across users, transactional concurrency and durable audit logging. The transaction API must never accept these trusted fields directly from an unverified browser request.

No real enrollment, document signing, voting or remote terminal access is activated. Independent database and security certification is required before routing.
