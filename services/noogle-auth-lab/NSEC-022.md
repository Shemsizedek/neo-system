# NSEC-022 — Browser passkey adapter

Client module `docs/connect/passkeys.js` contains WebAuthn credential-creation serialization. It deliberately **refuses registration** unless a same-origin backend reports all of: `webauthn=enabled`, `device_enrollment=enabled`, `identity_session=verified`. Existing NSEC-021 backend reports disabled, so **no production credential is created**.

Server requirements for operational use:
- Verify authenticated owner on the server (never trust client capability claims or client supplied owner IDs).
- Issue single-use CSPRNG challenge with owner/session binding and RP ID `connect.holytemples.org`.
- Verify clientDataJSON origin and challenge, authenticator RP hash, user verification, cryptographic attestation / credential public key according to policy.
- Atomically consume challenge and persist credential; enforce CSRF, origin and session rotation; support recovery, rate limits, revocation.
- Return safe JSON options, not signing secrets; maintain secure HttpOnly cookies and disallow cross-origin writes.
- End-to-end tests must use genuine browser+authenticator. Browser feature detection and mock tests never certify security.
- Remote terminal remains disabled. No Guardian APK change or DNS/hosting deployment.
