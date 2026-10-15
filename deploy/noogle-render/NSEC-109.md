# NSEC-109 — Noogle Connect identity bridge

Non-routed composition contract only. The browser cannot select the authenticated subject or assertion assurance.

Before enabling:
- Verify actual NEO Pass issuer and session revocation; do not treat the experimental ES256 verifier as an interoperable issuer without confirmation.
- The device assertion must be WebAuthn-verifiable using a server-issued, scoped, single-use challenge with user verification and authenticated credential ownership. An HTTP string called `proof` is not sufficient.
- Bind the assertion to the **specific action**, target device ID, HTTP method and intended changes to prevent replay across list/rename/revoke operations.
- Require account/device revocation checking at proof time, authorized credential store, audit, CSRF/origin checks and rate limits.
- Use certified durable Postgres migrations and dedicated least-privilege credentials.
- The existing staging pairing demo cannot grant device identity or elevate permissions.
- Do not mount authenticated device routes or ship NEO Pass secrets to Render until integration tests certify all these dependencies.
