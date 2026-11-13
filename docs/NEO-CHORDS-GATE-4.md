# NEO Chords — Gate 4: fenced read-only worker queue

**Project:** NEO System / Project 144  
**Status:** Draft PR #1410 source pilot. Not merged or deployed.  
**Gate order:** VERIFY → CONNECT → BUILD → TEST → DEPLOY → DOCUMENT → NEXT GATE

## Do not duplicate the existing system

Use the established NEO Router mission engine, NEOpass-authenticated command router, Chords voice/gate-handoff proposals, and NEO Nous OS staging assets. This gate does **not** create another general-purpose OS, another voice interface, another DNS system, or a separate provider-identity authority. Do not reuse the existing NEO Crawler Redis queue's non-atomic LPOP/GET/SET claim as a concurrency-safe multi-worker scheduler.

## Added

- `orchestration/neo-chords/fenced-queue.mjs`: a narrowly scoped, **default-paused**, Redis-backed `read` task queue with one atomic EVAL operation per admission, claim, settlement, crash recovery, and cancellation. Redis server time controls leases. Fencing token plus monotonic generation rejects stale acknowledgments. Retry waits are bounded; exhausted tasks go to dead-letter; output data is not written as raw provider content, only a hash, provider identifier and safe code. The queue works only with explicit public, parameter-free, read-only capability IDs and denies arbitrary prompts, internal data and unexpected job fields.
- `orchestration/neo-chords/fenced-queue.test.mjs`: 17 isolated Node.js tests including simulated concurrent worker claims, pause switch, retry/backoff, dead-letter, expired lease recovery, cancellation, stale token, idempotency, output evidence digest, and one in-process call through the existing NEO read-worker adapter with an injected mock command router. The test transport *models* Redis command/Lua behavior — it is **not** a live Redis EVAL test.
- `.github/workflows/verify-neo-chords.yml`: dedicated path-filtered CI job to run all Chords and separate Accords tests. The existing root `npm test` script **does not include** `orchestration/neo-chords/*.test.mjs`; previous generic CI success is not evidence those tests ran. Do not label this new workflow green until observed on the PR commit.

## Safety and scope

- `enabled` is unset by default, so claims return `PAUSED`. **There is no public HTTP endpoint to enable the queue.** Only the approved runtime/operations deployment should configure this key after checks. All queue operations assume an already authenticated internal service; **never** expose enqueue, cancel, status, enable/disable or claim directly to untrusted callers.
- The queue namespace defaults to `neo:{chords}:v1` (shared Redis hash tag). Its read-task list is **separate** from the Gate 3 proposed gate-order list `neo:chords:v1:pending`. **No gate order automatically becomes an executable task**. Admission of read jobs requires a future trusted operator-bound mission producer with approved capability and cost-policy validation.
- The optional `createReadJobRunner` processes **one** bounded read task at a time. It accepts the existing `createChordsReadWorker` rather than using generic MCP, shell execution or model credentials. A timeout leaves the claim open for lease recovery. It cannot forcibly cancel an outbound provider call, and a later retry may repeat a read. The local runner stays busy until a timed-out provider call eventually settles. Thus the design is **at-least-once for reads only**, not exactly-once remote execution.
- No automatic publication, external outreach, financial transfer, deployment, DNS update, legal act, crypto signature, privileged data egress, paid-model invocation or provider enrollment is authorized by these files. Add those as separately reviewed task classes only after policy, consent and compliance validation.
- A lease timeout alone does not prove a provider call ceased. Use bounded safe reads, make providers idempotent, enforce external timeouts/cost caps and keep side-effecting tasks out of this queue.

## Local validation (simulated transport)

`node --test orchestration/neo-chords/fenced-queue.test.mjs`

Expected: **17 tests passed**, no failures. CI must separately run on the committed branch. The local test fixture uses synthetic provider output and an in-memory model of atomic Redis operations; **the actual Lua script, Upstash endpoint, background worker process and authenticated NEO runtime remain unverified**.

## Staging release blockers

1. Confirm an authorized, isolated staging Redis/Upstash instance exists and supports `EVAL` with this key layout. Do not inspect or export secrets in chat or code.
2. Integration-test Lua commands against real Redis, including two independently running worker processes; check stale lease tokens and crash/retry semantics, startup default disabled, recovery after process restart, and Redis unavailable handling.
3. Create a trusted operator-scoped producer to map **explicitly approved** Gate 3 receipts into read tasks, without allowing arbitrary mission text to choose capabilities or parameters. Reuse the NEO JWT subject resolver and actual authorization authority rather than fabricating `verified:true` from request data.
4. Configure a persistent worker host with a controlled schedule, leased reads, `recover()` loop, metrics and alerts, provider call deadline, output schema and provenance checking, usage/cost ceiling and manual kill switch. No deployment from this source gate.
5. Prove one live read-only NEO platform capability from a real authorized provider, capture job ID/status/evidence, then rehearse standby worker recovery on an **independently operated** host. Existing staging Render services are not automatically independent backup hosts; DNS and database promotions retain their separate authority checks.
6. Add rate limits, bounded queue depth, retention/PII controls and reconciled backups; check the separated NEO Accords code for optional consent requirements.

**Gate 5:** real isolated Redis EVAL, trusted auth bridge, one actual read-only worker through existing NEO Platform API, measurable failover and readback. Release requires verified CI, no new spending, explicit secrets control and no unsafe production mutation.
