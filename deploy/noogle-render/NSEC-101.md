# NSEC-101 — NEO Pass trust bridge (inactive)

The ES256 JWT verifier is a **non-routed, offline test implementation**, not a claim that the existing NEO Pass token issuer uses ES256 or these claims. Before enabling it:

1. Verify the real NEO Pass issuer, algorithm, signing-key management, `iss`, `aud`, `jti`, token lifetime and rotation policy using authoritative issuer configuration. Do not adapt authentication to guessed tokens.
2. Retrieve and cache issuer-approved JWKS over a trusted channel, with strict `kid` allowlisting and rotation, rather than supplying client-provided keys.
3. Provide a real revocation store (the callback must fail closed on errors).
4. Add an origin-bound, nonce-based WebAuthn assertion ceremony verifying origin, RP ID, signature, flags, user verification and monotonic signature counters; only then may a trusted server create device-bound assurance.
5. Connect to the durable device store only after row-level access, concurrency, encryption, backup and audit checks.
6. Separate enrollment, document signing, voting and remote terminal permissions; **none enabled**.

Current verifier returns `assurance: session-only` even for valid signed tokens. The registry requires `device-bound`, so JWT verification alone cannot enroll a device. Not imported into the public staging HTTP service.
