# NEO Chords - Gate 1 / Project 144

**Status:** SOURCE PILOT ONLY. Seven local isolated Node.js tests passed on November 11, 2026. Not deployed. No live Claude, Perplexity or other AI job was executed. No standing background workflow, user identity, provider API credentials, queue, paid call or production change was enabled.

## Intent and naming correction
NEO Chords is the multi-agent **work orchestration system** for NEO. An operator should eventually issue one authorized command from ChatGPT or another NEO entry point, and Chords should route bounded subtasks to independent AI/worker platforms, persist their status, reconcile evidence and return a result.

Earlier PR #1410 introduced **NEO Accords**, an identity-bound approval/consent receipt mechanism. This is distinct from orchestration. Preserve Accords as an optional future governance component, **not** the Chords runtime.

## Repo components to reuse
- `orchestration/neo-router.yaml` specifies provider-neutral routing and candidate provider roles, including Claude, ChatGPT/OpenAI, Gemini and Cloudflare. This is **architecture specification, not proof of working provider credentials**.
- `server/neo-crawler/worker.mjs` and `docs/NEO-CRAWLER-V1.4-WORKER.md` illustrate a queue claim/complete/fail and retry/dead-letter design that a persistent Chords executor can reuse.
- `governance/automation/neo-automation-control-plane.md` defines authorization and escalation classes.
- Existing NEO Nous OS staging services were listed in Render's NEO SYSTEM workspace; no Chords staging runtime was verified.

## Implemented in Gate 1
- `orchestration/neo-chords/chords.mjs`: preflight plan; task dependency DAG validation; worker capability/data-class allowlisting; read-only task kinds `research`, `analyze`, `draft`, `summarize`, `test`; explicit `public` or `internal` data class; internal-to-public dependency blocking; bounded concurrency; candidate fallback; redacted audit events; in-process command idempotency; blocked-dependent handling.
- `orchestration/neo-chords/chords.test.mjs`: seven unit tests with mock workers. Tested locally with `node --test orchestration/neo-chords/chords.test.mjs` after construction (same source content).
- Interfaces are intentionally dependency injected. An actual provider adapter, authenticated gateway, durable queue, cross-restart deduplication, cancellation, timeouts, circuit breakers, output schema checks and persistent audit store remain **future work**.

## Correct architecture

```text
ChatGPT / NEO operator
    |
    v
NEOpass-authenticated Chords API + policy gates
    |
    v
Durable mission queue (Neon or existing trusted queue)
    |
    v
NEO Nous OS + NEO Router scheduling and oversight
    |
    +---- Claude/Anthropic provider adapter (when authenticated)
    +---- OpenAI provider adapter (when authenticated)
    +---- Gemini provider adapter (when authenticated)
    +---- Perplexity provider adapter (when authenticated)
    +---- authorized remote MCP worker gateway (when tested)
    +---- local NEO agent / bot worker (when deployed)
    |
    v
Output validation + provenance + redacted audit + status
    |
    v
Operator notification / Chords dashboard
```

**Important access boundary:** ChatGPT-connected plugins and MCP tools cannot automatically be called by unattended code on Render. Each independent worker needs an authorized remote API/MCP endpoint and scoped server-side credentials. Search for Claude and Perplexity plugins did not identify installed direct connector integrations in this session. Provider names in router configuration are not live connectivity evidence.

## No autonomous escalation
Gate 1 only runs injected read-only or drafting adapters. It does not publish, send outreach, update DNS, deploy, open or merge production changes, execute legal agreements, move funds, sign with wallets or broadcast Bitcoin transactions. Follow existing per-workstream approved automation rules and explicit gates for consequential actions. Keep service credentials in a secret manager, never in mission payloads or git commits.

## Gate 2 - CONNECT, PERSIST AND TEST
1. Verify each actual provider/account/endpoint and authenticated external invocation separately; mark `VERIFIED`, `NOT CONFIGURED` or `BLOCKED` with evidence.
2. Introduce authenticated Chords ingress, authorization scopes, persistent mission IDs, durable claim leases, retry/dead-letter queue and cancellation. Ensure cross-node fencing prevents duplicate execution.
3. Admit one least-privilege **read-only** provider adapter first; enforce per-run token limits, spend caps, timeout, external data classification, schema validation, prompt-injection boundaries and a kill switch.
4. Deploy to isolated HTTPS staging only, then prove a full command-to-queue-to-worker-to-evidence-to-status cycle and provider failover. Production stays unchanged until review and CI pass.
5. Add status retrieval and notifications so results can be checked from ChatGPT; unattended processing must run in an authorized host/scheduler and is **not** provided merely by this chat.

Owner: Project 144 / NEOsync. Release blockers: CI, third-party provider authorization, durable queue, service authentication, secret handling, observability, cost controls and HTTPS staging verification.
