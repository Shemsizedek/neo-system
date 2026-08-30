# NEO Pads Production Readiness Runbook

This runbook governs the transition from tested NEO Pads runtime code to a production environment. It does not authorize live payout execution.

## 1. Required production boundaries

Before deployment, configure the production database, consumer web origin, NEOpass API, wallet-signature verification service, NEO Counter checkout API, authenticated NEO Counter webhook secret, operations token, payout status API, and chain-confirmation verifier.

All secrets must remain in the deployment platform or GitHub Actions secrets. Do not commit credentials, seed phrases, signing keys, or private keys to this repository.

## 2. Database gate

Run migrations with `npm run db:migrate` from a controlled deployment job before switching traffic. Then run `npm run production:readiness`.

The readiness verifier performs read-only database checks after connection. It requires the canonical NEO Pads production tables and the payout-operation columns introduced by the ordered migrations.

If the verifier reports missing tables or columns, stop deployment and run the migrations against the intended database. Do not bypass the schema gate.

## 3. Payout safety gate

`NEO_PADS_PAYOUT_EXECUTION_ENABLED` must remain `false` during deployment verification. The readiness command fails closed if live payout execution is enabled unless `NEO_PADS_ALLOW_READINESS_WITH_LIVE_PAYOUTS=true` is deliberately set for a separately approved go-live procedure.

Provider payout reconciliation remains read-only. A provider-reported settlement does not become local `SETTLED` while chain confirmation is required unless the payout has a transaction ID and the configured chain verifier confirms it.

## 4. Runtime verification

After deployment:

1. Confirm `GET /health` returns a live process.
2. Confirm `GET /ready` reports the configured persistence layer ready.
3. Run `npm run production:readiness` from the production network boundary.
4. Confirm the consumer frontend origin matches `NEO_PADS_WEB_ORIGIN`.
5. Verify NEO Counter webhook signatures with a non-financial test event where supported.
6. Verify the payout operations workflow can perform the `status` action without enabling payout submission.

## 5. Operational controls

Hourly payout operations are allowed to reconcile provider status, verify chain confirmation, create audit events, and escalate stale records. Scheduled operations must not submit payouts.

Escalated payouts can be acknowledged and resolved by an operator. Acknowledgement and resolution only change operational metadata and produce audit entries. They do not alter settlement state or move funds.

## 6. Go-live decision

Do not enable live payout execution merely because CI and readiness checks pass. Enabling `NEO_PADS_PAYOUT_EXECUTION_ENABLED=true` is a separate production decision requiring verified NEO Counter payout credentials, provider endpoint validation, monitoring coverage, rollback readiness, and an explicit operational approval.

When live execution is approved, retain idempotency keys, payout uniqueness per booking, provider reconciliation, and chain-confirmation requirements.

## 7. Rollback

If production verification fails:

- keep payout execution disabled;
- stop new traffic or return the service to the last known-good deployment;
- preserve database and audit records;
- do not delete or rewrite payout history;
- use reconciliation and operator controls to classify unsettled payout obligations;
- repair forward with a new migration rather than editing already-applied migration history.

## 8. Incident priorities

For payout incidents, prioritize prevention of duplicate submission, preservation of audit evidence, confirmation of provider state, confirmation of the transaction on the relevant settlement rail, and documented operator resolution. Never infer settlement from an HTTP success response alone.
