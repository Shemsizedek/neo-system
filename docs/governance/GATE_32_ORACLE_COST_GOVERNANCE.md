# Gate 32 — Oracle AI Cost Governance (PROPOSED; NOT ADOPTED)

Status: **NO-GO for production spending or deployment**. This document is a review draft and does not authorize new provider accounts, payment methods, charges, credentials, deployment, or release.

## Verified implementation baseline

- Gate 31 CI workflow run `39871078573` completed successfully on commit `a1bd0f1d3bdc4b9a44ea9c115d7d3fc7b8ae591b`.
- Oracle API review branches include request count, per-process concurrency, request character/action budget, default 1,024 output tokens per provider attempt, maximum two provider attempts, and provider-reported usage normalization.
- Router `attempts` ledger reports provider, status, and normalized usage for each attempt; usage can be unknown.
- These controls remain stacked **draft PRs** and are not proof of production enforcement.

## Cost and security control inventory

| Control | Current review-only implementation | Release requirement |
| --- | --- | --- |
| Authentication | Client/operator bearer credentials | Approve policy, rotate secrets, least privilege |
| Request count | In-memory per credential | Distributed enforcement and abuse tests |
| Concurrency | In-memory per credential/global | Multi-replica stress validation |
| Input size | Character/action bounds | Bound system context and all provider payloads |
| Output tokens | Requested per-attempt ceiling | Verify each provider honors the limit |
| Retries | Maximum two provider attempts | Test reliability and account for all attempts |
| Token usage | Successful/failed attempt ledger, unknown allowed | Durable privacy-reviewed attribution and reconciliation |
| Dollar spending | **Not implemented** | Explicit human-approved hard cap, provider billing alerts and stop behavior |
| Error hygiene | Not fully audited | No provider secrets or sensitive payloads in logs/responses |

## Required cost governance decisions (unapproved)

1. Name a human budget owner and separate technical operator and financial approver.
2. Approve provider allowlist, model versions, region, maximum daily/monthly spend in USD, and incident contacts.
3. Define provider-side hard limits wherever supported and a conservative fail-closed application budget backed by shared durable storage.
4. Require preflight reservations and settlement for all provider attempts; release reservations on verified non-consumption; retain unknown usage for reconciliation, not as zero.
5. Reconcile actual invoices and provider usage against the ledger; document handling of failed attempts, retries, cached tokens, and late billing.
6. Document emergency disable/kill-switch, key rotation, alert thresholds, and rollback procedures.
7. Approve data retention, redaction, access control, and export of usage records.

## Acceptance checklist before GO

- [ ] CI passes on the exact reviewed merge candidate.
- [ ] Security and financial policies explicitly approved by accountable humans.
- [ ] Credentials are configured in authorized secret stores and privilege tests pass.
- [ ] Integration tests demonstrate denial before provider invocation at all quota and concurrency limits.
- [ ] Multi-instance distributed quota and budget enforcement is tested.
- [ ] Provider output-token ceilings are verified using mocked requests and staged integration tests.
- [ ] All provider attempts, including failures and timeouts, have attributable accounting with unknown states preserved.
- [ ] Billing reconciliation, alerting, kill-switch, incident response, and rollback are exercised.
- [ ] Independent staging HTTP smoke tests pass.
- [ ] Authorized release decision records scope, budget, deployment target, and approvers.

## Next gate

**Gate 33 — Ledger Privacy and Financial Budget Design**: specify minimal durable event schema, error sanitization, idempotency, shared-budget reservations, and tests. No spending or production rollout without approval.
