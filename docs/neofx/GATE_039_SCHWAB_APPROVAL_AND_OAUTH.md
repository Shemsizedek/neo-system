# NEO-FX-039 — Schwab developer approval and OAuth release checklist

**State (2026-10-13):** Verification request sent; no new Schwab approval or support response in checked Gmail. No OAuth client has been registered or granted access in NEO FX. Live execution OFF.

## Account registration
- Sign into https://developer.schwab.com/ and complete login-credential setup using Schwab's time-limited official link. If expired, request fresh verification through Schwab's official portal.
- Confirm developer account status in the portal. An existing Trust investment account and third-party financial-data sync do NOT imply API product approval.
- Submit an application for the correct API product according to Schwab's published account-use restrictions and trustee entitlements.
- Capture confirmation of application ID and approval only in a private administrative log, not the public repository.

## Backend preparation
- Use Google Cloud Run in us-central1, with the official NEOfx domain.
- Keep the registered OAuth callback internal to an authenticated authorization service, with HTTPS, exact redirect match, CSRF state, session binding, one-time state expiry, PKCE where supported, and strict origin policies.
- Use Google Secret Manager for API client credentials and refresh tokens, dedicated IAM service identity and audit-only access.
- Establish a tenant-scoped trust account record. Never expose account numbers, balances, credentials, beneficiaries or tokens in public GitHub or UI state.
- First authorize read-only account/positions/history access if Schwab's product and scopes permit. Broker data must preserve source timestamps and visible stale states.
- Block all live order routes at the backend until broker-specific permission review, risk limits, kill-switch tests, fiduciary approval and separate release authorization are evidenced.

## Acceptance
[ ] Developer credentials created and portal account verified
[ ] Schwab API app approved for intended trust and product
[ ] Callback deployed and security tested
[ ] Signed-in trustee completed OAuth consent
[ ] Account discovery/position retrieval reconciled with approved account
[ ] Token rotation, revocation and incident rollback verified
[ ] Live order execution independently disabled

## Correspondence
The verification email was sent to api-development@schwab.com from nooneuniversity@gmail.com. A reply has not yet been identified in the mailbox check. A preexisting weekly finance automation includes registration monitoring; do not create duplicate tasks.
