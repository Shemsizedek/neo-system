# NTEL-008 — Noogle Telecommunications Operational Readiness

Noogle Telecommunications remains NeoTele's designated internal telecom operator. This gate adds an **evidence checklist** and a preliminary sponsored-connectivity cost coverage calculator. It does **not** confer ETC authorization, validate authenticity of supplied evidence, negotiate wholesale capacity, or enable cellular lines.

## Approval checklist
1. Carrier/MVNO wholesale contract with pricing and provider identity.
2. SM-DP+ eSIM provisioning agreement and test credentials.
3. ZIP-specific coverage/device eligibility evidence.
4. Emergency service (911/E911), number portability and consumer protection operating requirements.
5. Funding documents sufficient for proposed $0 subscriber pricing, including monthly wholesale obligation, pilot cohort size and sponsor commitment.
6. Subscription terms, privacy notices, informed consent and cancellation obligations.
7. For any Lifeline-funded offering, ETC designation, SAC and compliant USAC enrollment workflow are separate required evidence controls.

## Security
Do not store provider secrets, activation tokens, EID/IMEI, government benefit records or National Verifier outcomes in the evidence metadata. Keep evidence documents in access-controlled storage and independently verify their references and timestamps. A caller-provided `verified:true` is **not** independently certified evidence: wire the review process to a trusted audit registry before considering release. Deployment/real eSIM provisioning and billing stay disabled.

## Implementation
- `server/neotele/operations-readiness.mjs`: pure readiness evaluator and funding arithmetic.
- `server/neotele/operations-readiness.test.mjs`: blockers and Lifeline gates.
- Tests: `node --test server/neotele/*.test.mjs`.

## NTEL-009
Tie evidence to trusted Chaplaincy and Noogle approval records, persistent cost ledger, operational portal and provider test environment; then seek explicit security and deploy authorization.
