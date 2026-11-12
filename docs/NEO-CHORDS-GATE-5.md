# NEO Chords — Gate 5: Actual Redis integration verification

Project 144 · 2026-11-12 · Source-only draft PR #1410.

## Delivered

- Added `orchestration/neo-chords/redis-live.test.mjs`, an integration suite that directly sends Redis RESP commands to an isolated Redis 7 instance over loopback. It invokes the **actual Lua EVAL scripts** in the existing Gate 4 fenced queue; unlike the Gate 4 fixture, it does not simulate Redis semantics.
- Extended the existing `Verify NEO Chords` GitHub Actions workflow with an ephemeral `redis:7-alpine` service and a separate opt-in integration step. Test mode `NEO_CHORDS_TEST_REDIS=1` is set only for that step. No repository secrets or provider credentials are used.
- Tests cover default-paused operation, concurrent-worker claims, forged lease-token refusal, completed read evidence, Redis server-clock lease expiry, crash recovery, cancellation, stale acknowledgements and post-test pause.
- The ephemeral test uses a test-only `neo:{chords}:gate5:ci` Redis key namespace. It never calls FLUSHALL/FLUSHDB and is bounded to loopback in CI.
- The test worker is a synthetic read-only adapter. It does not call Claude, Gemini, Perplexity, Anthropic or an actual Composio/MCP service, and does not perform money movement, publication, DNS or production changes.

## Existing foundations — no duplication

- NEO Nous OS and NEO Router remain the orchestration foundations.
- Gate 2 Noocratic voice proposals remain non-executable.
- Gate 3 handoff stores proposed gate orders separately from Gate 4 read-work jobs.
- Gate 4 Redis-backed fenced read queue remains **paused by default**. No public endpoints, persistent worker process, background scheduler or AI provider were activated in Gate 5.
- Existing Render NEO Nous OS staging services are not on this Chords branch and were not redeployed.

## Acceptance and limitations

To pass source testing: the dedicated GitHub workflow must finish successfully for the Gate 5 branch head, including its live Redis 7 integration step. This is not proof of Upstash provider compatibility, actual deployed NEOpass authorization, real model-provider invocation, or live multi-provider failover.

Before runtime activation:
1. Verify authorized Redis REST/EVAL support without revealing credentials.
2. Confirm trusted NEOpass JWT subject and server-side scopes; do not accept body/header claims for operator authority.
3. Implement a separate, reviewed, namespaced, authorized task producer for public read-only capabilities, with explicit per-run usage/spend caps and a kill switch. The read-worker currently consumes only prevalidated, parameter-free requests.
4. Mount to an existing authorized HTTPS staging API and run one real read-only capability against an independently verified connected provider.
5. Collect audit, task result and retry evidence; verify standby recovery and rollback. Test lease/fencing semantics under actual network interruption.
6. Verify independent hosting, domain/naming control and encrypted restore-tested backups before claiming decentralization or performing any DNS/primary database switch.

GitHub CI success is scoped to the tests it actually ran. Keep the PR draft until end-to-end integration and operational controls pass.
