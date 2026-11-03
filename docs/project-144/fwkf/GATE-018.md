# Knowledge Forum — Gate 018 acceptance and safety

**Existing environment:** Neon project `neo-twlf-forum` in AWS us-east-1. It hosts existing TWLF and WorldCafe functions. Neon Auth is **not enabled** on main, and database table inventory returned **zero tables**. Do not change the existing live TWLF forum/domain, WorldCafe domain, or production branch.

**Product:** Free World Knowledge Forum — a topic-organized discussion community for Knowledge Society and Information Society members, with questions, resources, voting, threaded conversations and moderator tools.

## Built in this gate
- Version-controlled **proposed schema migration** for separate `fwkf_forum` schema: communities, members, posts, replies, votes, reports and moderator audit trail.
- No real member accounts, forum data, seeded fake posts, personal conversation excerpts, or live posting.
- Initial statuses are draft/pending. Anonymous database privileges revoked explicitly.
- SQL constraints require target membership on votes and reports; authorship and role-based authorizations must be enforced in a trusted API layer; schema alone does NOT secure a client-accessible service.

## Launch controls still required
1. Explicitly choose and configure the member identity service; verify session JWTs, redirect origins and bans. Preserve existing providers; do not turn on Neon Auth on a live project without reviewing side effects.
2. Forum API: verified session on every write, moderator role authorizations, per-user and per-IP limits, HTML sanitization, CSRF/CORS protection, request size bounds.
3. Moderator review queue, reports, safety escalation, appeals, audit log, content retention and account deletion.
4. Backups and restore test; separate test branch. Perform migration after reviewing it with `EXPLAIN`/schema tooling, not directly against live.
5. Prove multi-account ACL denial tests, spam/flood tests, deletion tests and rollback.
6. Then publish real forum URL and enable public posting. The World Café forum landing page should continue to say **in development** until verified.

**Public privacy rule:** Never ingest unpublished Project 144 chat messages or private NEO workspace content. User submissions require explicit individual consent.

**SEO blocker:** GSC Wizard connectors returned `payment_required`. A sitemap is already live; no new subscription/payment was authorized or started.
