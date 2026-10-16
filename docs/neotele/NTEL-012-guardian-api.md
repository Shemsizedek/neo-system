# NTEL-012 — Guardian challenge control and operator HTTP boundary

Added a trusted-adapter Guardian WebAuthn result gate binding authenticated subject, approval decision, evidence revision/digest, reference, credential and consumed one-time challenge. The challenge consumption adapter MUST be atomic and durable. WebAuthn signature verification, RP/origin enforcement, actual challenge issuance and device attestation belong to a certified NEO Guardian server integration: this file **does not implement** cryptographic verification.

Added an **unmounted** operator API contract for an authorized operator dashboard and evidence review mutation, rejecting unverified-origin mutations. Session and operator authorization come from trusted backend middleware, never user-supplied JSON.

Crown Chain Evidence Vault anchoring remains pending. Trustworthy persistence, issued challenge records, immutable audit and transaction integration are required before deployment; verify separately that authenticated subject is identical across the API, NEOpass, Guardian credential and database reviewer identity. Existing approval model still requires a server-side independently verified evidence review.

Test: `node --test server/neotele/*.test.mjs`. All real SIM activation, network access and funding remain disabled.
