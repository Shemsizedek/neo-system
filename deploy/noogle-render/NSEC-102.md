# NSEC-102: Device-bound authentication certification gate

This is an **inactive** verification component, not a WebAuthn server or live pairing implementation.

Before using it:
- Verify the official NEO Pass issuer and bind its authenticated subject to the passkey credential and challenge. Never rely only on browser-provided subject IDs.
- Issue cryptographically random one-use challenges; bind each to credential, account, purpose and exact RP ID. Consume atomically; expire rapidly and rate-limit attempts.
- Validate authenticators, credential registration and supported COSE algorithms using a maintained, reviewed WebAuthn implementation. This proof-of-contract does not parse COSE registration or support all authenticator formats.
- Require HTTPS, exact origin and RP ID, user presence and verification, and handle authenticator counters safely (including legitimate zero counters).
- Connect verified proofs to the durable device registry only after database isolation and auditing are certified.
- Do not expose this module as a public route in Render staging. Signing, voting, remote terminal and device enrollment remain off.
