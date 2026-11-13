# Project 144 — Gate 021: Knowledge Forum private-alpha gateway

**Date:** November 1, 2026 (America/New_York; cloud logs may be Nov 2 UTC)  
**Outcome:** Isolated **Neon staging Forum gateway LIVE and fail-closed**; branch-managed Auth trusted origin configured; six topic communities staged as drafts; invite-only login frontend and session code committed but **NOT deployed/verified with a real user**.

## Scope and source of truth
- Existing Foundation home, World Café and World Leaders Forum custom domain remain unchanged.
- Neon project `neo-twlf-forum` id `purple-waterfall-10955254`, staging branch `br-misty-sun-b850yi7t`, **not** main `br-young-brook-b8quup3r`.
- Staging branch is currently scheduled to expire `2026-11-15T23:00:00Z`; avoid extending without an explicit operational decision. Existing Neon free-plan settings retained.
- Managed Better Auth already provisioned on **staging** only; configured one trusted browser origin `https://worldcafe.holytemples.org` on staging. Main's Auth and trusted origins are not modified.
- Managed Auth's default staging configuration permits its own sign-up endpoint, but that **does not grant Forum membership or posting**. No public Forum registration UI or member activation has been deployed; review auth signup policy before any beta invitation.

## Live API
- New Neon Function `fwkfalpha` runs only on staging; not a replacement for existing `worldcafe`, `twlfforum` or `legacygateway` Functions.
- Endpoint: `https://br-misty-sun-b850yi7t-fwkfalpha.compute.c-14.us-east-1.aws.neon.tech/`.
- Source: `apps/fwkf-forum/functions/alpha/index.mjs` (version-controlled and separately deployed as a single-file ZIP through Neon).
- Final Neon Function deployment `id=2` **completed** after JWT verification corrections.
- Live fresh HTTPS checks:
  - `GET /health` HTTP **200** with `environment=private-alpha`, `status=read_only`, `registration=false`, `posting=false`.
  - Anonymous `GET /me` HTTP **401** with `AUTH_REQUIRED`.
  - Unknown path `GET /not-found` HTTP **404**.
  - Code and automated tests confirm all POST routes return **405 POSTING_NOT_ENABLED**; a live POST was **not** independently exercised in this gate.
- Browser CORS allowlist hardcoded to Foundation hostname; deny unknown origins; no secret keys or token strings logged or returned.
- Membership endpoint verifies Ed25519/EdDSA JWT signatures via branch-injected JWKS, subject and expiration, rejecting missing/invalid bearer tokens.
- **Important correction:** official Neon Auth documentation requires JWT `iss` and `aud` to match **the origin** of `NEON_AUTH_BASE_URL`. Initial code expected the full path and `authenticated`; fixed, regression-tested, redeployed. This correction was made *before any real-user sign-in*. No live signed member token has yet been tested.
- The gateway is read-only and does **not yet query Postgres**. The separately developed PostgreSQL adapter remains in GitHub, not deployed in this Function.

## Staging Forum data and privacy
- Six actual topic categories created with `status=draft` and `visibility=public` (draft is not published):
  `knowledge-ideas`, `research-sources`, `world-library`, `learning-careers`, `technology-innovation`, `local-knowledge`.
- Read-back confirmed **6 draft communities** and **0 posts, 0 replies, 0 members, 0 reports** on the staging branch.
- No personal data, imported private chat, fake discussion content or user credentials created or moved.
- Existing live service/domain data and configuration remain untouched.

## Private alpha user interface
- Added `apps/fwkf-forum/web/member-session.mjs`: connects a verified Neon Managed Auth session to the **exact allowlisted staging** `GET /me` endpoint. JWT kept in memory, no local/session storage, strict read-only, denies bad server responses.
- Added `apps/fwkf-forum/web/alpha-login.html` + `alpha-login.mjs`: responsive sign-in and sign-out UI design, email/password field, disabled state and accessible status messages, no sign-up or posting.
- Updated `web/auth-sdk.mjs` to the current documented standalone Neon SDK import `@neon/neon-js/auth`. The SDK build/dependency and browser-origin flow have **not yet been installed, bundled, deployed or validated**; those files remain in GitHub.
- Public `https://worldcafe.holytemples.org/forum-preview.html` remains the **read-only**, noindex preview. Do not link the invite-only login UI from public pages before testing and access controls pass.

## CI and verification
- `apps/fwkf-forum/tests/alpha-gateway.test.mjs` covers health, anonymous denial, synthetically signed EdDSA JWT, wrong claims and tampered signatures, POST closure, CORS and 404 behavior.
- `apps/fwkf-forum/tests/member-session.test.mjs` covers GET-only signed session bridge, explicit staging-host allowlist, token refusal and sign-out behavior.
- `apps/fwkf-forum/tests/alpha-login-static.test.mjs` enforces no public signup, credential persistence, POST calls or public indexing in the new UI.
- Previous domain/SQLite, RSA JWT, Neon EdDSA and PostgreSQL adapter tests are preserved.
- GitHub Actions **Free World Knowledge Forum — security and domain tests** passed, run `41366611031` (source commit `02f64d21209ec26a68b1f4a5dfe884fbd0fe554c`), including the test suite with the member-session email normalization regression fixed in prior commit.
- All current verification is source/CI, schema readbacks and live unauthenticated cloud requests. **No claim of a real invited user successfully signing in, of durable production Postgres writes, or of public Forum readiness.**

## Next gate — FWKF-022
1. Select authorized staging tester identity and independently verify sign-up or invite, sign-in, sign-out, session refresh, token validation, denial and expiry. Review and close generic staging sign-up policy.
2. Bundle the documented `@neon/neon-js/auth` client for a separate restricted test host. Use the verified branch-specific credentials; never publish secrets or credentials in source.
3. Implement server-side member invitation binding and least-privilege PostgreSQL read/write adapter inside the staging Neon Function. Scope queries to verified member; restrict roles, rate-limit and audit.
4. Test end-to-end authenticated questions, answer moderation, voting, reporting, cross-user denial, abuse protection, rollback and backup/restore.
5. Only after moderation staffing, policies, user privacy, and review signoff, allow a limited beta, then public posting. Keep all physical café operations as a separate workstream. No Penguin dependency.
