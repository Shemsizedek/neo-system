# NEOPASS-013 — Passkey enrollment and secure browser routes

Adds a standalone opt-in HTTP server factory and a responsive Noogle NEOpass account page. It connects to the NEOPASS-012 account service through server-only methods; no server starts on import, no existing platform routes change and no public login button is added to third-party sites.

Routes: GET / (enrollment/login UI), /passkey.js, /passkey.css, /api/session; POST /api/register/options, /api/register/verify, /api/login/options, /api/login/verify and /api/logout. Enrollment is disabled by default and requires explicit server opt-in.

The server generates the browser-binding handle in a __Host-noogle-browser Secure HttpOnly SameSite=Strict cookie. Ceremony requests cannot supply their own browser/account identity. Origin, JSON content type and a custom request header are required for mutations. Duplicate browser cookies, missing cookies and bodies above 64 KiB are rejected. A bounded in-memory browser rate limiter limits ceremony requests; production additionally requires shared ingress rate limiting that cannot be bypassed by resetting a cookie.

Successful login writes its handle only to the __Host-noogle-session Secure HttpOnly SameSite=Strict cookie, never the JSON body or a URL. Logout deletes the persisted session before clearing the cookie. The status endpoint returns only authentication/enrollment booleans. The page has a restrictive CSP, no third-party scripts, no camera/microphone/location permissions and no framing. Browser WebAuthn JSON conversion is feature-tested; unsupported browsers are told they are unsupported.

Recovery is explicitly unavailable. The page advises using an existing credential provider/device and does not claim that a new account restores an existing one. Adding backup credentials, account migration and recovery remain separate security work.

Validation: 156 platform/NeoMask/Noogle Connect tests pass. Four new HTTP tests verify secure cookies, server-bound enrollment, non-disclosure of session handles in response JSON, logout revocation, origin/cookie/body checks, explicit enrollment opt-in and rate limiting. HTTP lifecycle tests use a controlled account-service fixture; the separate NEOPASS-012 tests validate real WebAuthn cryptography with synthetic authenticators. No physical device enrollment was performed.

Not deployed. Production requires TLS and persistent storage, a reviewed enrollment/owner migration policy, retention/backups, ingress controls, real browser/security-key testing and recovery/credential management. The complete OIDC issuer, keys/JWKS and first relying-party callback still need implementation. This UI authenticates a local Noogle account only; it is not yet a completed third-party social-login provider.
