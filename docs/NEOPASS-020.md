# NEOPASS-020 — server-verified Google identity session

Added a server-only Google identity verifier using the installed jose JWT library and Google's fixed public JWKS endpoint. The verifier enforces RS256 signatures, accepted Google issuers, the configured web client audience, a fresh issuance time, explicit expiry, a one-time login nonce and authorized-party matching when present. Challenge records are browser-bound and consumed once. Provider tokens are not stored.

Existing member lookup receives only the normalized provider issuer and stable provider subject, never email. Only an active mapping to a preexisting canonical account permits a short-lived opaque session. Session lookup rechecks the authoritative member mapping, preventing disabled or reassigned identities from retaining enrollment access. The session format matches the linked-enrollment identity resolver contract from gate 019. Durable SQLite storage supports non-consuming session lookup; logout deletes the hashed handle record.

24 targeted tests pass, including real RSA JWT verification, signature/issuer/audience/nonce/expiry/authorized-party rejection, browser binding, replay, persistence, mapping revocation, prior real WebAuthn verification, first-account pinning and ordered access checks.

Runtime inspection: Render recovery still runs the generic platform server. No existing OAuth client ID was found in the source branch; prior Render environment inspection also found none. No client ID, token, seed, private key or owner identifier is published here.

Activation remains blocked on the existing Google OAuth web client ID, authoritative provider-to-member mapping, durable Render provisioning and authenticated HTTP wiring. This module is not mounted as a live endpoint. Google is used strictly as a sign-in provider; no Google Cloud hosting or Firestore dependency was introduced. Other providers are not yet implemented. CounterPay/GISD enforcement remains unchanged.

Verification reference: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
