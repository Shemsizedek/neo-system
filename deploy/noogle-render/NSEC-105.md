# NSEC-105: Enrollment trust-boundary hardening

The internal proof gate implements a non-serializable, one-use JavaScript object capability for server-only code. It is **not** production device attestation and is not mounted in the live Render server.

Before activation:
1. An audited WebAuthn registration verifier, not an HTTP boolean, must be the **only** holder of the issuer capability. Never export issuer to routes or user code.
2. The device registry must require the consumer capability, rather than accepting `assurance:'device-bound'` or `proofVerified:true` from callers.
3. In-memory WeakSet checks are single-process only. Production must transactionally bind challenge, credential insertion and unique constraint in durable storage with cross-worker replay protection, idempotency and interrupted transaction recovery.
4. Confirm NEO Pass issuer and bind verified session subject and exact relying-party origin.
5. No device is enrolled by this module; signing, voting, terminal access and all protected /connect routes remain denied.
