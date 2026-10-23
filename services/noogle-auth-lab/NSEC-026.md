# NSEC-026 — Enrollment authorization policy (laboratory only)

Implements a server-side, memory-only NEO Pass session authorization model with identity verification, random session identifiers, CSRF secrets, 5-minute TTL, revocation and an unconditional remote-terminal block.

**Security boundary:** The `freshProofValidated` parameter is a trusted-server integration seam, not an authentication mechanism. The caller MUST derive it from a verified recent credential assertion. Never accept this flag from client JSON, query parameters or arbitrary headers.

Sessions currently exist in a local process Map: **not production safe** (no shared persistence, distributed revocation, rotation, secure-cookie issuance, transaction atomicity, or audit). The secret is supplied through trusted server configuration, never via the browser. The tests exercise policy logic, not actual phone biometrics or FIDO2.

Next gate: implement proof-backed NEO Pass session freshness in the actual NEO Pass backend; use durable, atomic authorization state and HTTPS Secure HttpOnly cookies; integrate WebAuthn server verification and enrollment registry before enabling UI. No DNS, Guardian APK or remote terminal changes.
