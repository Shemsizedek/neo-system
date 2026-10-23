# NSEC-025 — NEO Pass identity integration contract

Source includes a narrow, server-only ES-module adapter using the existing `verifyNeopassToken` function.

The bridge enforces a valid signature, issuer, mandatory future expiration, subject, and rejects tokens with unrelated scopes or token-use claims. This is an adapter and **not** an authenticated HTTP route, a user login flow, or a production deployed service.

## Integration boundaries
- Noogle cannot accept Crown Chain office attestation or Oracle browser tokens as Guardian authentication.
- NEO Pass must provide a separately authenticated login and session, and independently determine account membership/eligibility and freshness.
- The `csrfValidated` and `freshLogin` booleans are trusted-server-side caller preconditions, not proof generators; NEVER derive these from client JSON or headers alone.
- WebAuthn registration still needs validated challenge, origin, RP ID, and atomic credential persistence.
- Public web app, Android APK, Chromebook agent and remote terminal are not connected in this gate.
- Credential renewal, token revocation, same-site session cookies, multi-device ownership, authorization and audit require implementation and end-to-end tests before deployment.

Run `node --test services/noogle-auth-lab/identity-bridge.test.mjs` from repository root. No production changes.
