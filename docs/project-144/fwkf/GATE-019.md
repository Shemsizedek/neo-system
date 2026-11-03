# Project 144 — Gate 019: Home link and Forum private prototype

**Date:** 2026-11-01
**Owner:** NEO Society / Free World Knowledge Foundation
**Product boundary:** World Café lives at `https://worldcafe.holytemples.org/`. Free World Knowledge Forum is a separate future discussion service; not the existing World Leaders Forum.

## Verified public website change

- Added a **visible hero button** to `/world-cafe.html`: `← Back to Foundation Home` linking to `/`.
- Added **Foundation Home** to the mobile navigation. The existing modern page, original Foundation homepage, navigation and all related paths remain intact.
- Render manual deployment `dep-dbjqkiff3r2c73csaeqg` reached **live** status.
- Independent HTTPS readback: `https://worldcafe.holytemples.org/world-cafe.html` returned HTTP 200, displayed `Back to Foundation Home` and linked to the original home.
- No indexability, DNS, WordPress content, transaction or public user registration changes in this gate.

## Forum application implementation

Source added under `apps/fwkf-forum/`:
- `src/core.mjs`: testable business rules for questions, answers, votes, reports, moderator-only approvals and hiding. All new questions/replies stay pending; no anonymous content.
- `src/sqlite-test-store.mjs`: private ephemeral SQLite tests with no production dependency.
- `src/auth-jwt.mjs`: strict, fixed-issuer, fixed-audience RS256 signature verifier with expiration checks. User roles come from trusted member database, not JWT role claims.
- `src/http-api.mjs`: private HTTP routes, POST Bearer auth, same-origin policy, 24 KiB JSON body bound, protected moderation route, no-store replies, and health status reporting `private_prelaunch`.
- `tests/*.test.mjs`: database, HTTP and cryptographic tests; `node:test` has no external dependencies.
- Fixed a critical migration bug: the earlier votes table had a composite PK with nullable target fields. It now uses UUID PK with separate unique partial indexes for posts and replies.
- `.github/workflows/fwkf-forum-ci.yml` uses Node 24 and read-only GitHub checkout for automated tests. No Penguin runtime or testing dependency.

## Verified tests and limitations

- Local isolated DB + generated test keys: **10/10 unit and integration tests passed** in ChatGPT's container. This count includes core domain, HTTP route, and cryptographic JWT tests.
- GitHub Actions workflow committed and triggered for review; actual CI run may still be queued. Do not claim a CI pass until its job conclusion is successful.
- Neon `neo-twlf-forum` project currently lacks managed Auth and has no deployed forum tables; a new Neon branch/compute was not created because new resource spending and authorization still need review.
- Neither public posting nor a production forum database, sessions, live API, moderation staffing or real frontend is active. Existing WordCafe and World Leaders Forum deployments remain unchanged.
- User direction: Forum resembles a trusted Reddit/Quora-style community; no private chat content or fake discussions are to be published. The Penguin machine is **not** required for deployment or normal operation.

## Next gate — 020

1. Establish a bounded isolated Neon testing branch, with known spend/quota and verified Auth provider. No live TWLF or WorldCafe mutations.
2. Implement the Postgres store, stable migrations, real identities, server moderation roles, sign-in UX and a private test deployment; test cross-user ACL.
3. Build question/feed/reply/voting/moderator UI, then test end-to-end, backups, privacy, abuse reports, accessibility and rollback.
4. Promote only after independent production signoff; update `worldcafe.holytemples.org/forum.html` to point to the actually working Forum at that time.

## Gate 019 follow-up verification

- Added asynchronous store support to domain rules and a separate `src/pg-store.mjs` with parameterized SQL and atomic moderator write/rollback.
- Added four Postgres adapter tests, bringing isolated container test suite to **14/14 passing** (HTTP, JWT crypto, SQLite workflow, Postgres SQL mock). These are source/adapter tests, **not** live Neon integration tests.
- GitHub Actions Forum security workflow completed successfully at commit `8e7f3f8729cba6bbd0ca41c41e0363034fa2cbdd` before the Postgres test module was added. Do not assert its later run has passed without checking.

- Follow-up verification: GitHub Actions **Free World Knowledge Forum — security and domain tests** completed with **conclusion success** for commit `73fcf7ea9f67719dad8c243c95f0940d9f4975ad`, including the PostgreSQL-adapter tests. This is CI/source verification; it is not a deployed live database or member-login test.
