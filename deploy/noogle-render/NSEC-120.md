# NSEC-120 NEO Mask WebAuthn registration

Added server-side creation options and fail-closed registration orchestrator. This module is not imported into the public Render HTTP server.

**Not activated:** Real biometric/passkey enrollment requires a tested, cryptographic WebAuthn attestation verifier and matching durable challenge plus credential stores. The injected verifier in unit tests is a mock, not cryptographic verification. NEO Pass issuer/session interoperability is not yet verified on Render. No production account/passkey has been created.

The authenticator supplies PIN/fingerprint prompts through its own operating system. The server must never receive biometric data or passkey private keys.

A browser implementation must use `navigator.credentials.create({publicKey: options})` with correctly decoded binary challenge/user ID and submit the resulting attestation for validation. Production implementation must bind a stable, account-scoped opaque user ID to the verified account (the temporary random user ID generated here is per ceremony), and must save credentials atomically with challenge consumption. This source is not yet suitable to mount as a public registration endpoint.

Bitcoin anchoring is deferred: a later consented audit proof may anchor a batch commitment, but no passkey secret or identifiable credential data should be written to a blockchain.
