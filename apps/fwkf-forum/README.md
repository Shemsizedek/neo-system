# Free World Knowledge Forum — private alpha source

**Purpose:** Our own topic-based question-and-answer and community discussion platform, with the usability of Reddit and Quora, but governed for the Free World Knowledge Society and Information Society.

## Implemented in source
- Topic communities and question posting; new content starts **pending moderation**.
- Answers and threaded replies, with parent-reply checks.
- Helpful votes (one per member per target), reports, moderator approval/hiding, and audit trail.
- Verified-subject authentication interface with an included RS256 JWT verifier. Requires a real trusted identity issuer; **no demo or anonymous identity is accepted in a public service**.
- Explicit server-side member role checks, author limits, rate-limit hook, input validation, same-origin checks, JSON body limit, and non-cacheable API responses.
- Local isolated SQLite test storage, never attached to the WorldCafe website or Neon production.
- Postgres migration proposal in `migrations/0001_forum_schema.sql` (not applied).

## Local tests without Penguin

Run from the repository root with Node 24:

```sh
node --test apps/fwkf-forum/tests/*.test.mjs
node scripts/verify-fwkf-forum-foundation.mjs
node --test tests/verify-fwkf-forum-foundation.test.mjs
```

The tests use a fresh, private `:memory:` SQLite database and generated ephemeral cryptographic test keys. All sample conversations in tests are fictional. No real users or private project-chat content is imported.

## Production launch gates still closed
- [ ] Select and configure a real identity provider/JWKS and verified issuer/audience. Neon Auth is currently **not enabled**.
- [ ] Create an isolated Neon **test** branch with an approved cost/quota policy; apply and validate SQL migration there. Do **not** write to current Neon main without a reviewed rollout.
- [ ] Implement the actual Postgres adapter under least-privilege DB credentials with transactions and a durable rate limiter.
- [ ] Add a real frontend, accessible sign-in experience, category search, pagination and notifications with user privacy controls.
- [ ] Complete adversarial tests: cross-user access, replay/rate limits, spam, XSS, CSRF, abuse reporting, moderator audit, rollback/restore, deletion and retention.
- [ ] Configure monitoring, backups, two independent moderators, community policy and verified data-protection controls.
- [ ] Deploy to a **separate** cloud service and custom hostname after verified acceptance. Keep `forum.holytemples.org` (World Leaders Forum) unchanged.

No public forum is operational yet. This code is a **functional tested private prototype**, not a production authorization or public invitation to post.
