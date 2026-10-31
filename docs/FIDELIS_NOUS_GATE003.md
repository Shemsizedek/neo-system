# Fidelis OS × NEO Nous OS — Gate 003

Status: integration scaffold only; no Fidelis OS source recovered or merged.

This isolated bridge reuses the existing Crown authorization verifier, with two narrow capability scopes: `fidelis:knowledge:read` and `fidelis:knowledge:propose`. All other actions fail closed. No route is exposed, no production credentials are required, and no writes, token issuance, ledger settlement, LMS enrollment, or deployment are performed.

## Proposed knowledge destinations
- Temple Knowledge Index
- World Library
- World Café
- Free World Knowledge Index

Records are proposals and must undergo provenance, copyright, privacy, and editorial review before publication. Noological Doctrine is recorded as the requested framework, not an independently verified source of truth.

## Existing dependencies
- NEO Nous: `docs/NOUS_ECONOMIC_VALUE_KERNEL.md`
- Crown: `server/crown-auth/verify.mjs`
- GISS/GISD/Cipher LMS: `server/neo-careers/cipher-giss-bridge.mjs`
- NEO Cipher: `src/security/neoCipher/`

## Blockers
1. Recover Fidelis OS source from the local D: drive or a separate repository.
2. Confirm Fidelis API contracts and ownership before implementing transport.
3. Define approved NEO IP licensing and access scopes.
4. Validate Crown trust endpoint in a test environment.
5. Obtain legal/compliance review before any World Currency issuance.

Run focused tests: `node --test server/fidelis-nous/*.test.mjs`.
