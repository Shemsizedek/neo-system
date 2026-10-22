# Gate 33 — Usage Ledger Privacy & Shared Budget Design

**Status: PROPOSED / NO-GO.** This is a technical design for review. No database, provider billing account, spending authorization, production secret, or deployment is created or changed.

## Objective

Define an auditable, minimal, privacy-conscious ledger and a shared-budget reservation protocol for Oracle provider attempts. Existing per-process request and concurrency controls and in-memory attempt reports are not distributed spending controls.

## Minimal ledger event (proposal)

- `event_id`: unique opaque identifier, immutable.
- `mission_id_hash`: keyed hash of mission identifier; never store mission prompt or raw identifier.
- `principal_id_hash`: keyed hash of credential identity; never store API key, bearer token, or authorization header.
- `request_id`, `attempt_index`, `provider_id`, `model_id`, `state` (`reserved`, `started`, `settled`, `unknown`, `reconciled`, `cancelled`).
- `occurred_at` UTC, `idempotency_key` opaque unique value, `policy_version`.
- `input_tokens`, `output_tokens`, `total_tokens`: nullable integers from provider; unknown is NULL, never zero.
- `estimated_max_cost_microusd`, `billed_cost_microusd`: nullable integer micro-USD amounts with pricing version and source; estimate is not an invoice.
- `provider_request_id_hash`: optional keyed hash for reconciliation, never raw request/response payload.
- `error_class`: allowlisted category only, not provider error text or response body.

No objective text, system prompts, provider raw response, secret values, user IP, or personally identifying metadata in the default ledger.

## Budget reservation state machine (proposal)

1. **Authenticate** and classify privileges before parsing the request.
2. **Preflight** validate payload, provider allowlist, token ceiling, and action policy.
3. **Atomically reserve** worst-case per-attempt cost in a shared durable store using a unique idempotency key, conditional on approved account/day/month caps and existing reservations. If pricing, budget policy, store, or identity is unavailable, **deny** the provider call.
4. Mark attempt `started` before invoking the provider; track each retry as a distinct reservation. Limit to the approved attempt ceiling.
5. **Settle** against provider-reported usage when trustworthy and reconcile later with billing. Missing usage becomes `unknown` and retains the full reservation until reviewed or provider-confirmed non-consumption.
6. Release unused reservation only on verified settlement or confirmed no charge. Avoid double-settlement using transaction-level idempotency.
7. On timeouts, crashes, duplicate delivery, or lost acknowledgments, preserve the reservation and reconcile; never silently refund unknown attempts.
8. Refuse new calls when budget, quota, provider-side limits, or kill-switch require it.

## Integrity, privacy and operations

- Append-only events or immutable audit history; encrypt at rest and in transit.
- Strict role-based read access and redacted operational dashboards.
- HMAC identity derivation with rotation plan and separately managed secret; plain SHA-256 of a known low-entropy identifier is insufficient.
- Set retention period, deletion/export rules, and privacy owner before deployment.
- Define reconciliation frequency, ledger/provider invoice tolerance, alert thresholds, and incident response.
- Use integer minor units and explicit model/version/region price catalogs. Do not use floating point for monetary authorization.
- Provider-side billing limits and independent kill-switch remain mandatory defense in depth.
- Test concurrency with two or more workers and simulated crashes; no reservation may be oversubscribed or double settled.

## Proposed acceptance tests

| Case | Expected outcome |
| --- | --- |
| Two concurrent workers race for last budget | At most one reservation succeeds |
| Replayed idempotency key | No duplicate debit or provider attempt |
| Missing or stale price data | Fail closed before provider invocation |
| Failed attempt without usage | Remains unknown; reservation held |
| Provider timeout or worker crash | Reservation survives and reconciles |
| Confirmed partial usage | Settle precisely and release verified remainder |
| Secret or prompt injected into error | Ledger and API output redact content |
| Daily/monthly cap reached | Reject before provider call |
| Kill-switch activated | Reject all new paid provider calls |
| Multi-provider fallback | Each attempt reserved and attributed separately |

## Human approvals required

Budget owner, finance approver, security/privacy owner, provider/model allowlist, maximum authorized USD daily/monthly amounts, storage/retention policy, pricing source, incident contacts, and staging/production deployment approvals.

## Next gate

**Gate 34 — Privacy-safe ledger schema and reservation simulator**: implement isolated deterministic tests and mock-only design validation. Do not connect to billing, create durable production storage, or deploy without authorization.
