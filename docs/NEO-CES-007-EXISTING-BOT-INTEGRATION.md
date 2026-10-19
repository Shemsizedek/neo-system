# NEO-CES-007 — Existing Bot Reuse and NEO Bank Coordinator Integration

## Verified existing modules
- `server/neo-bots/bank-bot.mjs`: NEO_BANK_BOT, NMNI and XCPC exchange identities, CES review/approval/V-Dollar/publication/subscription actions, explicit value-movement approval.
- `server/neo-bots/runtime.mjs`: BotRegistry, NeoBotRuntime, AuditLedger.
- `server/neo-bots/deployment-runtime.mjs`: registers the existing bot and defaults to createStubCesAdapter().
- `server/neo-bots/ces-legacy-profile.mjs` and `ces-form-mapper.mjs`: legacy site discovery and allowlisted form mapping.
- `src/ces/auth.ts`, `session.ts`, `worker.ts`, `liveBrowser.ts`: authorized CES session and collection framework.
- `src/books/legacyCesCoordinator.ts`: NEO Bank coordinator authorization contract.

## Integration decision
Reuse NEO_BANK_BOT and NeoBotRuntime; do not create another bot registry or competing CES executor. Treat the new NEO Books coordinator gateway as a permission-checking facade over the existing NEO Bank Bot job submission API. Map each coordinator's appointed NEO Bank account to their CES exchange and permitted job scopes. The bot must return the real legacy receipt before NEO Books records a completed transaction.

## Confirmed blockers
The default deployment runtime still uses createStubCesAdapter(). Its health method reports liveCesExecutionEnabled:false. Source existence and a bot status of active are not evidence of deployed CES access or completed financial operations.

## Activation acceptance criteria
1. Inspect the deployed bot runtime and configured adapter without printing secrets.
2. Verify authorized coordinator-owned CES login and session expiration/recovery in isolated staging.
3. Validate the legacy form fingerprint and exact allowlisted operations.
4. Bind NEO Bank coordinator identity, exchange, tenant, scopes, approvals, and idempotency to existing bot jobs.
5. Persist job state, immutable execution receipts, retries and reconciliation across process restarts.
6. Forward verified CES financial events to NEO Ledger and NEO Books, with V-Dollar backing and reversals reconciled.
7. Complete synthetic read-only tests before narrowly enabling approved write operations; no broad autonomous issuance.
8. Expose coordinator dashboard actions through the authenticated NEO Bank API, not CES credentials in the browser.

Do not claim production enablement until authenticated live tests and receipts confirm it.
