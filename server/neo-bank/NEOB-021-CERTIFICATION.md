# NEOB-021 Certification Gate

## Executable integration test

Run the Firebase Firestore emulator with a disposable project. Install firebase-admin in the local development environment and execute:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node --test server/neo-bank/firestore-emulator-cert.test.mjs
```

The test is intentionally skipped when the emulator or SDK is absent; skipped is NOT certified. It uses only synthetic accounts, and asserts that concurrent duplicate transfers post only one balanced transfer, that the approval is consumed on commit, and that insufficient-credit failure leaves approval unconsumed. The test is never to be pointed at production.

## Still required before merge

- Execute emulator tests and collect an actual PASS result; broaden tests to conflict retries and transaction interruption.
- Integrate a trusted WebAuthn verification implementation, register credential key/counter records, and issue trusted challenges. Do not enable a verifier that simply returns true.
- Ensure authenticated approval issuance, replay protection, challenge consumption, and authenticator counter updates are durable and atomic or cryptographically replay-proof; audit challenge and ledger state transitions.
- Review the existing CES Firestore data model, authorization, role separation, bank session cookies, CSRF, tenant coverage, precision/rounding and payment limits.
- Build a production-specific staging certification gate and security review. No payment rails, credit issuance, or Bitcoin broadcast should be enabled.

## Domains

- NEO Bank: neobank.holytemples.org
- NeoMask: neomask.holytemples.org
- Existing passkey RP: connect.holytemples.org (do not change silently)

## Current release status

Draft PR only. This gate does not modify live infrastructure or confirm any actual WebAuthn credential or Firestore emulator execution.
