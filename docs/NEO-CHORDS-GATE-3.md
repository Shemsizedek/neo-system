# NEO Chords — Gate 3 / Project 144: authenticated durable handoff pilot

**Status:** committed to draft PR #1410. Source-only, not mounted into the production NEO Platform API, not enabled in Nous OS, not deployed. No live third-party model calls, no DNS changes or new spending.

## Reuse — not a second operating system

This gate complements the existing modules:
- `src/noology/neotericMethod.ts`: canonical Noocratic Rules of Order.
- `orchestration/neo-chords/gate-orders.mjs`: Gate 2 natural-language proposal interpreter.
- `server/neo-platform-api/integration-hub.mjs`: NEOpass JWT subject resolver and authorized read-only app tools.
- `server/neo-platform-api/command-router.mjs`: read-only capability execute and status.
- `server/neo-router/mission-engine.mjs`, `mission-runtime.mjs`, `persistent-store.mjs`: established mission and persistence concepts.
- `server/neo-crawler/redis-queue.mjs`: existing crawler-specific Redis queue with retry and dead-letter handling.

**Security review finding:** The crawler queue's claim path uses LPOP, GET and SET as separate operations; it does **not** supply atomic multi-worker fencing or durable in-flight recovery. Do not reuse it unchanged for Chords worker execution. The existing router lease's GET then DEL release is also non-atomic. This source pilot adds only atomic gate admission; it is **not** a completed exactly-once worker executor.

## Implemented Gate 3

- `handoff.mjs`: externally provisioned Redis active-gate record, single Lua EVAL for deterministic order receipt + gate-revision fence + queue admission, duplicate receipt replay, class-A enqueue and higher-risk hold, no execution. Key namespace `neo:chords:v1` separate from crawler and router.
- `http-handler.mjs`: opt-in bearer-authenticated HTTP handler. Requires trusted NEOpass resolver and authoritative scope lookup (`chords.gate.propose`); blocks unsigned/cross-site/malformed/oversized calls. **It is not mounted**: production authority must not be inferred from arbitrary claims or request headers.
- `read-worker.mjs`: thin allowlisted wrapper for existing NEO Platform API command-router read capability. Default restriction to public data and no outbound parameters; custom parameter policy only after careful allowlist review. No generic MCP or model-provider invocation is enabled.
- Tests: `handoff.test.mjs` (8), `http-handler.test.mjs` (3), `read-worker.test.mjs` (5) = **16 isolated local Node.js tests passed**. Redis script behavior simulated by an in-memory transport, NOT tested on a real Redis server. HTTP test uses an injected mock identity resolver, NOT a real NEOpass login.

## Production admission requirements

1. Existing authenticated NEO Platform API must mount this handler with its real JWT subject resolver **and** a server-side executive/operator scope authority, not a requester-provided `verified` flag. Refuse to mount if no role registry exists.
2. Provision a reviewed, backed-up, independently reachable gate-definition record in an authorized Redis/Upstash namespace. There is no admin initialization endpoint; seed only with trusted operator review. Require `id`, monotonic `revision`, `next.id`, and `next.approvalClass`.
3. Verify EVAL is permitted by the actual Redis plan/provider and write/read one synthetic order in isolated staging. Check concurrent requests and process restart, including duplicate delivery suppression. Treat queue admission as a proposal, not permission to run arbitrary jobs.
4. Add an atomic claim/ack lease with owner token, expiry, renewal, fencing generations, stuck-item recovery, retry budget, dead-letter, cancellation and audited status. **No queue consumer exists in this gate**.
5. Add explicit per-task allowlist, provider credentials in secrets manager, per-run spend/usage cap, timeout, data egress policy, output verification, independent audit store and kill switch.
6. Validate one real read-only capability through NEO Platform API and one independently operated standby provider; passing mocked tests does not establish actual provider connectivity.
7. Test independent hosting, naming authority and encrypted restore-tested backup evidence in staging before declaring decentralization or automated failover. Live DNS cutover and database promotion still require separately authorized policies.

## Verification and release boundaries

Local command: `node --test orchestration/neo-chords/handoff.test.mjs orchestration/neo-chords/http-handler.test.mjs orchestration/neo-chords/read-worker.test.mjs`

Keep PR draft until repository CI, staging Redis EVAL, JWT and scope integration, crash recovery, actual provider connectivity, rollback and observability pass. No automatic staging deploy should be attempted merely because these files were committed.

The prior separate NEO Accords consent prototype remains optional, not an executable authority. ChatGPT closing does not make source modules continue running in the background.
