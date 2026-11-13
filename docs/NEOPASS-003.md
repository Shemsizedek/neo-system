# NEOPASS-003 — Passkey assertion repair

Continues NEOPASS-002 in draft PR #1214. Fixes the valid assertion failure: Node createPublicKey rejects an existing public KeyObject, so the verifier now uses public KeyObjects directly and parses serialized SPKI keys. The isolated boundary accepts ES256/P-256 public keys only and rejects private or malformed keys.

Device-bound authorization now rejects backup-eligible/backed-up authenticator flags. Ordinary synced passkeys need a separate assurance policy; this verifier does not certify hardware attestation or biometric modality. The existing device-bound return label remains compatible with the surrounding boundary.

Tests cover valid KeyObject and PEM signatures, challenge replay, origin/RP mismatch, absent user verification, revoked credentials, counter rejection, malformed/private keys, and backup flags. An outdated PostgreSQL test was updated to use current list/revoke operations; existing atomic enrollment tests cover transaction/rollback behavior.

The JWT tampering fixture now flips a signature byte rather than replacing a character that could already have the replacement value. This removes an intermittent false failure without changing JWT verification behavior.

Validation: node --test deploy/noogle-render/*.test.mjs server/neo-tokenworks/*.test.mjs (65 tests). These are local cryptographic and integration tests, not a browser enrollment or real wallet certification.

Remaining gates: reviewed Bitcoin ownership signature adapter; authenticated routes and atomic durable challenge/credential storage; passkey enrollment/recovery; signed-in member testing; real CounterPay message signing. No HTTP routes, deployment configuration, custody or asset transactions change here.
