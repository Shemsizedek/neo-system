# NEOpass Authenticator — Project 144 / Gate 1

**Inactive browser app + WebAuthn transport prototype.** Not a live authentication service.

## Purpose
Provide a NEO-branded interface for actual FIDO2/WebAuthn security keys and platform passkeys. Reuse the trusted NEO Key registration, assertion, challenge, replay, PostgreSQL, issuer and recovery work in **draft PR #1435**. Do not create a second authentication authority.

A file on an ordinary USB flash drive **cannot** turn it into a hardware FIDO2 passkey. Any separately designed encrypted USB-file credential system would require a separate security review and server contract; it is not part of this app.

## Proposed server contract (NOT deployed)
All calls are same-origin, session-authenticated POST:
- /api/neopass/authenticator/registration/options
- /api/neopass/authenticator/registration/verify
- /api/neopass/authenticator/authentication/options
- /api/neopass/authenticator/authentication/verify

Backend must use trusted authenticated subject/RP/origin; issue and atomically consume short-lived one-use challenges; verify complete WebAuthn responses and user verification; enforce credential ownership, uniqueness, replay protection, rate limits, CSRF, recovery approvals, PostgreSQL transactions and audit. Browser data is never proof by itself.

## Gate
Buttons are intentionally disabled. Do not flip the client gate alone. Require security review, an approved backend and test/staging verification, real hardware and backup/recovery tests first. No production login changes, secrets, wallet signing, Bitcoin activity or deployment. Avoid enrollment of sensitive credentials on shared/library computers.

Run the isolated test with:
`node --test apps/neopass-authenticator/webauthn-client.test.mjs`
