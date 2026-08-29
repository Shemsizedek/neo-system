# NEO Bots Runtime

NEO Bots is the governed automation control plane for specialized NEO System agents.

## Gate 1 components

- `BotRegistry` — bot identity, status, scopes, and policy limits.
- `AuditLedger` — append-only in-process activity records for jobs and approvals.
- `ApprovalQueue` — explicit human approval or rejection for governed actions.
- `NeoBotRuntime` — scope enforcement, approval validation, handler execution, and audit events.
- `NEO Bank Bot` — initial financial-operations bot for authorized CES workflows.
- `createStubCesAdapter()` — safe default adapter that performs no external action until live CES integration is configured.

## NEO Bank Bot scopes

- `ces.transactions.review`
- `ces.transactions.approve`
- `ces.vdollars.issue`
- `ces.publications.upload`
- `ces.subscriptions.maintain`

Read-only transaction review can execute without an approval token. Governed write/value-movement actions require approval by default.

## Security model

Bots are service identities, not fabricated human accounts. Every bot receives explicit scopes and policy limits. External credentials must be supplied through the deployment secret store and must never be committed to the repository.

The CES adapter intentionally ships as a no-op stub. Connecting the live CES account is a separate gate requiring an authorized integration method, credential storage, and transaction-specific controls.

## Test

```bash
npm run neo-bots:test
```
