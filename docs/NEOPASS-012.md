# NEOPASS-012 — Independent Noogle passkey account engine

Adds an isolated server-side account service backed by exact-pinned @simplewebauthn/server 14.0.3. A new pseudonymous account becomes active only after verified WebAuthn registration. Subsequent discoverable-credential login verifies challenge, exact HTTPS origin/RP, user presence/verification, credential public key, signature counter and user handle. Authentication requires no Google, Facebook or ChatGPT token once the account is enrolled. No email, Temple role, KYC status or Bitcoin ownership is inferred from passkey registration.

The SQLite store persists ceremonies, accounts, credentials and hashed session handles. Ceremony consumption is atomic and browser-session scoped. Credential counter update and session issuance share one transaction; duplicate credential IDs cannot be reassigned. Revoking a credential invalidates sessions created with that credential. Disabling an account denies authentication. The session resolver returns the verified-subject contract expected by the Noogle provider grant core.

Browser adapters must create a cryptographically random browser-session handle and keep it in a server-controlled Secure HttpOnly SameSite cookie. The service's browserHandle parameter must never be accepted directly from arbitrary JSON. Session handles must be cookies, never query parameters or localStorage. This module creates no HTTP routes or browser UI.

Ordinary synced passkeys are allowed and classified as passkey-user-verified, not device-bound. Enrollment requests discoverable ES256 credentials and requires user verification. Biometric data stays with the authenticator. Hardware attestation, authentication modality and multi-factor claims are not certified by this gate.

Validation: 152 platform, NeoMask and Noogle Connect tests pass. New tests run real registration verification with synthetic none-attestation/COSE credential data, cryptographically signed P-256 assertions and real temporary SQLite files. They cover registration/login, restart persistence, ceremony replay, origin/browser/UV/user-handle rejection and credential revocation. These fixtures do not replace physical-device or browser interoperability tests.

The account engine remains server-only draft code. Before deployment: authenticated enrollment/migration policy for existing owner identities, recovery and backup credentials, credential management with step-up approval, HTTP body/origin/CSRF controls, rate limiting and storage retention, persistent host provisioning, cookie routes, reviewed OIDC issuer/token/JWKS implementation and real-device testing. SQLite is single-host; multi-host deployment requires an equivalent shared transactional store. No claim of complete OIDC conformance is made.

Reference reviewed: https://simplewebauthn.dev/docs/packages/server and https://simplewebauthn.dev/docs/advanced/passkeys.

No live CounterPay behavior, user credential, browser permission or production authentication changed. Existing verified CounterPay owner access remains intact.
