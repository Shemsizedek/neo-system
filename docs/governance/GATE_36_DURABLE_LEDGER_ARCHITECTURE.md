# Gate 36 — Durable Oracle Budget Ledger Architecture

**Status: PROPOSED / NO-GO.** Review-only architecture; no database provisioning, migrations, billing integration, deployment, or approved budget.

## Baseline and objective

Gate 35 CI run `39877799001` succeeded on commit `6cd536b0e27a36bbeaff4bf3baa52c32a93bac85`. The current mock simulator holds reservations in process memory and cannot recover from process termination. Gate 36 defines a durable, shared, fail-closed protocol to replace that limitation *after approval*.

## Proposed relational schema (not executed)

```sql
CREATE TABLE oracle_budget_accounts (
  account_id UUID PRIMARY KEY,
  cap_microusd BIGINT NOT NULL CHECK (cap_microusd >= 0),
  reserved_microusd BIGINT NOT NULL DEFAULT 0 CHECK (reserved_microusd >= 0),
  settled_microusd BIGINT NOT NULL DEFAULT 0 CHECK (settled_microusd >= 0),
  CHECK (reserved_microusd + settled_microusd <= cap_microusd)
);

CREATE TABLE oracle_budget_attempts (
  attempt_id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES oracle_budget_accounts(account_id),
  idempotency_key TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('reserved','started','unknown','settled','reconciled')),
  reserved_microusd BIGINT NOT NULL CHECK (reserved_microusd > 0),
  billed_microusd BIGINT CHECK (billed_microusd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, idempotency_key),
  CHECK (billed_microusd IS NULL OR billed_microusd <= reserved_microusd)
);
```

The schema is illustrative, not migration-ready. It omits production identity hashes, pricing version, policy version, append-only audit events, partitioning, and approved retention configuration. It uses aggregate counters for exposition; reconciliation must verify invariants against immutable event history.

## Transaction boundaries

**Reserve:** In a single database transaction, lock the budget account row, verify active policy/kill-switch, verify idempotency uniqueness, confirm enough available cap, increment reserved counter and insert attempt row. Commit before invoking any provider. On conflict, do not invoke again; return existing attempt status for safe replay handling. Use a serializable transaction or row locks with tested semantics.

**Start:** Mark `started` before provider invocation; if the process crashes after marking, reconciliation must treat the charge as uncertain. Marking alone cannot guarantee exactly-once provider execution.

**Settle:** Verify signed/trusted provider evidence, lock the account and attempt rows, transition once from reserved/started to settled, decrement reserved by the entire reservation, increment settled by verified billed amount, append immutable event, and commit atomically. Never accept arbitrary caller-supplied billing values.

**Unknown:** On timeout, crash, ambiguous response or missing usage, preserve full reservation, transition to `unknown`, append event. Never assume zero cost.

**Reconcile:** From unknown, use independently verified billing data and a unique evidence identifier; perform a single atomic transition to reconciled. Duplicate evidence must not debit twice. Over-reservation bills trigger incident handling, not silent accounting truncation.

## Crash windows and expected behavior

| Window | Recovery action |
| --- | --- |
| Before reserve commit | No provider call; retry reservation |
| After reserve commit, before provider call | Hold reservation; investigate stale attempt |
| After provider call, before response | Mark unknown; reconcile external billing |
| After settlement commit, before client acknowledgment | Replay returns existing settled state; no duplicate debit |
| During database outage | Fail closed; never invoke paid provider |
| Two workers reserve last budget | Only one may commit when capacity is insufficient for both |

## Privacy and security

Store no prompts, provider raw responses, bearer tokens, authorization headers, or secrets. Use opaque request IDs and keyed HMAC principal identifiers with rotation plan. Restrict ledger read/write by service role; encrypt data at rest and in transit; separate budget approval from technical operations. Define redaction, retention, backup, restore, audit access, and privacy owner before migration.

## Limitations and acceptance criteria

- A database transaction cannot guarantee exactly-once execution at an external provider. Design around at-least-once delivery with provider idempotency where supported and conservative unknown reservations otherwise.
- Provider invoices may arrive late or exceed estimates; enforce provider-side limits and independent kill-switch as defense in depth.
- Separate daily and monthly caps require transactional budget buckets and rollover semantics; the example schema models one account cap only.
- Tests must cover concurrent workers, crash injection at each boundary, duplicate callbacks, lost acknowledgments, provider errors, schema constraints, secret redaction, restore/recovery and stale pricing.
- Never migrate or deploy until accountable humans approve budget owner, provider list, monetary caps, storage region, data retention, security controls and rollback plan.

## Next gate

**Gate 37 — Transactional Ledger Contract Tests:** implement mock database adapter contract and deterministic failure-injection tests in isolation, without provisioning production storage or calling paid providers.
