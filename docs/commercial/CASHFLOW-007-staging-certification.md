# CASHFLOW-007 — Staging certification release gate

**Status:** Staged source and CI workflow, not deployed. Production M&A, live payment collection, external outreach and automatic contract execution remain disabled.

## Verified infrastructure inventory (2026-10-18)
- Render workspace: NEO workspace.
- Existing `neo-deal-desk` web service exists on Render, tracks `main`, auto-deploy enabled, and is a PUBLIC edge proxy to `egov.holytemples.org`, not an authenticated private staging app.
- Render Postgres inventory contains `noogle-connect-dev` and `neo-pads-production`; **no dedicated Deal Desk staging database exists**. Never reuse those DBs for commercial lead PII.
- CASHFLOW-005 and 006 exist as stacked draft PRs and their sources are inherited in this branch.

## Certification
A GitHub Actions workflow executes syntax and safety suites for API intake, PostgreSQL adapter, operator read access and Deal Agent shared handoff. Passing unit tests is **not** production certification or real staging end-to-end verification.

## Required remaining gates
1. Verify CI results and repair failures.
2. Provision *dedicated private* `neo-deal-desk-staging` database; configure encrypted backups and scoped service credential using Render secret manager. Do not commit secrets.
3. Provision separate staging service with ingress restriction and verified OIDC authorization; never change the existing public proxy without a separate review.
4. Apply migrations under rollback control. Verify durable lead insertion, idempotency and reload across service restarts.
5. Add and test distributed rate limiter, bot protection, TLS, CSRF/origin handling and privacy/retention controls.
6. Wire NEO Deal Agent discovery to Desk only through provenance-validated, idempotent queue/outbox and authenticated service-to-service transport; explicitly block live deal execution.
7. Require operator access and approval to advance opportunities. No irreversible calls from drafts.
8. Add traceable signed agreement + provider settlement evidence and cash reconciliation *only after separate payment gate*.

## Acceptance criteria
- End-to-end staged synthetic inbound lead survives restart, operator can see it, non-operator receives 403.
- Legitimate agent discovery with verifiable sources creates a non-binding review opportunity.
- Duplicate submissions create one logical record; backpressure and replay tested.
- No outreach, contract, cryptocurrency transfer, payment processor call or M&A execution occurs.
- Security and mobile dashboard acceptance evidence attached to release ticket.
- Only then consider a private operator URL and change of stage; do not claim real revenue.
