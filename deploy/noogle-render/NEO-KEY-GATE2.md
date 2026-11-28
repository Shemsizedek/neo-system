# NEO Key — Gate 2 isolated proof (Project 144 / #1434)

**Status: prototype only; do not deploy or mount as an HTTP endpoint.**

This proof composes the existing `challenge-service.mjs` and
`webauthn-assertion.mjs` without modifying production NEOpass, WebAuthn
login, Render configuration, wallet access or blockchain state.

## What is exercised

- Authentication challenge issuance for an already-registered credential.
- Session subject resolution through a caller-supplied **trusted server callback**.
- Credential-to-subject and exact RP ID / HTTPS origin binding.
- Scoped, expiring, one-time challenge consumption.
- Existing ECDSA signed assertion and user-verification checks.
- Negative-path tests for replay, wrong origin, unverified subject, tampering,
  missing user verification, expiry and missing configuration.

Run locally from the repository root:

```sh
node --test deploy/noogle-render/neo-key-prototype.test.mjs
```

## Security boundary

1. **Never pass untrusted request JSON as the verified session.** The
   `resolveSessionSubject` adapter must validate an authenticated NEOpass
   session server-side; the test's simplified `verified: true` fixture is
   deliberately **not** a production authorization pattern.
2. **No registration/attestation verifier exists in this prototype.**
   The `getCredential` callback must read a previously verified public key
   and its subject from an authoritative registry, not user-submitted input.
   This test uses a generated software key, **not a physical FIDO2 key**.
3. The existing verifier labels valid assertions `device-bound`; that label
   alone **does not establish authentic hardware provenance**. Do not grant
   privileges or sessions based on the returned object.
4. The test challenge store is single-process, in-memory, and unsuitable for
   production. Use the existing transactional PostgreSQL challenge-store
   contract with durable unique constraints and cross-worker concurrency tests.
5. Counter updates must be atomic with durable credential records. Counter
   interpretation must also handle authenticators that legitimately report zero.
6. The existing WebAuthn verifier handles a narrow signed assertion format.
   A maintained audited WebAuthn/FIDO2 implementation is needed for production
   registration, COSE algorithm support, client/browser compatibility, origin
   policy, and authentic hardware enrollment.
7. Do not reuse Bitcoin, NeoMask or Counterparty signing keys for authentication.
   Bitcoin anchoring is an independent later audit feature; no secrets or
   personal records belong on-chain. Do not make login depend on Bitcoin uptime.
8. Do not weaken existing authentication, enroll actual devices, issue access
   tokens, change DNS, enable USB-lock software, create paid resources or
   perform Bitcoin transactions at this gate.
9. The repository is public: never commit user identifiers, real credentials,
   seeds, private keys, recovery codes, or protected infrastructure settings.

## Future gating

- Review/replace narrow verifier with maintained WebAuthn library.
- Implement authoritative registration and recovery (two independently
  enrolled credentials), rate limits, revocation and audit.
- Test physical FIDO2 authenticators, multiple browsers/operating systems,
  passkey recovery, zero counters, concurrent replay, and rollback.
- Only then consider controlled staging deployment behind explicit feature gates.
- ChatGPT sign-in can only use supported account passkey enrollment; the NEO
  prototype is not an OpenAI/Daybreak authentication integration.
