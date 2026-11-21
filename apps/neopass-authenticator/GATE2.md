# Project 144 — NEOpass Authenticator Gate 2 integration readiness

Branch-only, inactive integration specification. Pull request #1447 remains draft.

## Verified source review
- NEO Key #1435 branch `feature/neo-key-gate2-prototype` provides `deploy/noogle-render/neo-key-security/staging-adapter.mjs`, but it is **non-routed** and explicitly requires injected, authoritative session, database and first-key approval dependencies.
- The registration verifier checks ES256/WebAuthn origin, RP, challenge, user verification and cryptographic credential data; it does NOT certify real hardware.
- The NEO Key Gate 9 dossier documents missing independent review, real FIDO2 primary/backup tests, approved issuer, HTTP protections and safe rollout evidence.

## API design — NOT implemented
Same-origin authenticated POST paths in `staging-contract.mjs`. Route adapters must be authored on the NEO Key branch after review. Only the server may select RP ID, origin, subject, account and challenge. Use server-tracked same-session ceremony state and one-use durable nonce binding; verify CSRF token, origin and session for all state-changing requests. Do not trust a client-provided "verified" value.

`inspectStagingReadiness` checks a future server-provided staging readiness document for completeness. **It is neither an authorization mechanism nor evidence of an actual security review.** This return value must never control server permission; the browser UI remains disabled regardless of readiness text until the backend is audited and wired.

## Known contract gaps
- Original browser serialization requires a reviewed alignment with SimpleWebAuthn's expected JSON (including authenticator attachment and transports where applicable).
- Original browser client optionally accepts a CSRF token; the server must require one and reject missing or invalid tokens. Consider default-deny client requests when not configured.
- No HTTP handler; no actual app-to-issuer integration, database provisioning, or real credential test.
- Independent security reviewer and approved operator bootstrap remain necessary before network exposure.
- No file on an ordinary USB drive can provide FIDO2 hardware identity.

## Verification
Run `node --test apps/neopass-authenticator/*.test.mjs`. This PR contributes negative-path tests; runner results must be recorded separately. No production deploy, merge, database migrations or spending.
