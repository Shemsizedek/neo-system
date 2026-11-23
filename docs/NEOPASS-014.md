# NEOPASS-014 — Identity endpoints and relying-client callback

Adds an opt-in OIDC-style authorization-code runtime: discovery, public JWKS, registered-client authorization, session-bound consent and a PKCE token endpoint. The passkey HTTP factory can mount the handler explicitly. Anonymous authorization requests return login_required; no upstream login is implied or performed.

ES256 ID tokens are signed with exact-pinned jose 6.2.13, using a server-provisioned private P-256 JWK. Only the derived public JWK is published. Tokens bind issuer, audience, pairwise subject, nonce and five-minute expiry. The token response also supplies a hashed-at-rest opaque access token; no user-info/API capability is exposed in this identity-only release. There are no refresh tokens.

Consent tickets are random, expire after five minutes, are consumed once and bind to the HttpOnly Noogle session handle. Codes are two-minute, hashed, single-use and S256-PKCE-bound. Duplicate authorization/form parameters, unknown callbacks, wrong origins and malformed grants fail closed. Persistent SQLite store supports atomic consumption and explicit expiry cleanup; callers must schedule retention cleanup and ingress rate limiting before production.

The server-side relying-client adapter starts authorization, stores state/nonce/verifier behind an opaque transaction handle and verifies its callback, backchannel token exchange and ID token with jose. It validates signature, expected issuer/audience/nonce/key ID and token age/expiry. The adapter returns only verified issuer/subject; the application must create its own secure local session. Its transaction handle belongs in a Secure HttpOnly SameSite=Lax client-site cookie, never client JSON or callback parameters.

Validation: 159 platform/NeoMask/Noogle Connect tests pass. New tests exercise actual HTTP authorization, consent, PKCE exchange, ES256 signing and client verification with real temporary SQLite. Replays, forged state, duplicate parameters, unknown callbacks, anonymous authorization and signed tokens with wrong issuer/audience/nonce/expiry are rejected. Authentication and consent inputs use controlled fixtures; live passkey/browser integration remains untested.

This is a tested protocol subset, not a certified OpenID Connect provider. Client-specific subjects are generated per registered client; full sector-identifier semantics and conformance testing remain outstanding. Runtime key rotation, persistent hosting, production key custody, recovery, shared rate limits and the first live relying website must be configured and verified before release. Already-issued offline ID tokens remain valid until expiry even if the source session is revoked; they grant no wallet signing rights.

No production deployment, client-site login button, real-user credential or wallet permission changed. CounterPay's independently verified owner-wallet association remains separate. The first relying website in this gate is a local protocol test client, not a deployed NEO application.

References reviewed: https://github.com/panva/jose and https://openid.net/specs/openid-connect-core-1_0.html.
