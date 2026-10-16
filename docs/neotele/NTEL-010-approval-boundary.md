# NTEL-010 — Noogle Operator Guardian Approval and Evidence Control

Implemented injectable NEOpass session validation, verified operator-role checks, Guardian approval assertion verification interface, and transactional review adapter boundary. A read-only operator summary redacts document contents. These are **contracts**, not integrated live services.

## Mandatory production conditions
- Wire session resolver to existing authenticated NEOpass backend, never browser-declared identities.
- Verify Guardian signatures with origin, RP ID, credential binding, challenge, single-use nonce, expiry and audit logging.
- Enforce independent evidence reviewer distinct from submitting actor in the **database transaction**.
- Implement immutable revisioned evidence records, transactional audit outbox, row-level authorization, rate limiting and CSRF defense.
- Connect evidence document hashes to a verified NEO Crown Chain Evidence Vault adapter; do not claim on-chain anchoring before proof exists.
- Consent, emergency-service, carrier contracting, Lifeline/USAC and $0 plan funding checks remain separate from document approval.
- Operator UI and API route are not yet mounted. No production activation enabled.

Run `node --test server/neotele/*.test.mjs` for local unit tests.
NTEL-011: durable approvals and certified NEOpass/Guardian/Crown Chain connectors.
