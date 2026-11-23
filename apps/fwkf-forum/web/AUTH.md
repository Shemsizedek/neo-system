# Forum Managed Auth integration boundary

Managed Better Auth was provisioned **only** on Neon branch `fwkf-forum-g020-staging` (`br-misty-sun-b850yi7t`), with the existing project `neo-twlf-forum` and unchanged `main` branch.

The front-end adapter `auth-sdk.mjs` uses the official `@neon/neon-js/auth` standalone SDK. At build time, configure the **branch-specific** `VITE_NEON_AUTH_URL` and add only the chosen isolated test-host origin to that branch's trusted origins. The adapter does **not** expose sign-up, and it does not trust the user's JWT role claims. Protected Forum server routes must validate Neon Auth's EdDSA bearer JWT through the configured JWKS and enforce the server-side member-role table.

Tests so far cover crypto signatures, API authorization, forum workflows, transaction rollback and read-only prelaunch UI. **Not verified:** an actual Neon-managed user signing in, session refresh, email verification, or browser-to-Postgres write flow. No public registration, posting or user data is authorized.

Staging branch expiry: **2026-11-15 23:00 UTC**. Extend it only deliberately after confirming the free-plan quota. No credentials committed.

## Gate 021 implementation

- Private alpha GET-only Neon Function: `fwkfalpha` on `br-misty-sun-b850yi7t`, with `/health` and bearer-only `/me`. All POST routes return `405`; CORS accepts only `https://worldcafe.holytemples.org`.
- The staging Auth trusted-origin allowlist now contains exactly `https://worldcafe.holytemples.org`. The live main branch's Auth configuration remains unchanged.
- Current official standalone browser import: `@neon/neon-js/auth` as documented in Neon’s React quickstart. The **unbundled**, invite-only sign-in UI is `alpha-login.html`/`alpha-login.mjs`; do not publish it until verified with a real test account and protected session.
- JWT issuer **and audience** equal the origin of `NEON_AUTH_BASE_URL`, not the full URL path and not the static string `authenticated`. The gateway validates EdDSA signatures using the branch-injected JWKS, subject, timestamp, issuer and audience. No caller-supplied JWT roles are trusted.
- Real member signup/signin/signout, token issuance, refresh and Postgres ACL were **not** demonstrated in a browser. Do not represent test stubs as a completed login integration.

## Gate 022 database membership
A second, read-only Neon Function, `fwkfdata`, queries the isolated PostgreSQL forum schema. `GET /communities` only exposes communities marked both `active` and `public`. `GET /me` accepts cryptographically verified branch Auth tokens but requires a separately approved `fwkf_forum.members` record; a valid Auth identity alone receives `403 MEMBERSHIP_NOT_APPROVED`. All POST routes return `405`; public posting remains closed. The invite-only UI is still **unpublished** and remains unverified against a real member identity.
