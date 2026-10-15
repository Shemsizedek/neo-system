# NSEC-104 — Registration coordinator: inactive contract

This coordinator is **not used by the public Render HTTP server** and does not make Android/Chromebook enrollment available.

Security blockers before enabling:
- The registration API must ignore caller-supplied RP ID, origin, subject and assurance; resolve trusted values server-side.
- Validate the real NEO Pass session issuer, audience, token revocation and same-session challenge ownership.
- The `verifyRegistration` dependency requires a maintained audited WebAuthn registration implementation: verify client challenge/type/origin/RP ID, attestation/authenticator data, flags, COSE key and credential uniqueness.
- Current coordinator delegates `device-bound` context to `deviceRegistry.enroll`; production registry MUST NOT treat a caller-provided assurance string as authentication. Use an internal verified-proof capability or server-private attestation artifact instead.
- Atomically bind verified credential, challenge consumption and registry insertion to prevent replay/races or consumed-but-not-enrolled states, with explicit recovery policy.
- Add CSRF/origin checks, audit, expiry/rate limits, cross-worker and failure-injection tests.
- Production NEO Pass keys, real device enrollment, document signing, voting and terminal control remain disabled.
