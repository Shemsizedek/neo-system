# NEO Chords — Gate 2: Noocratic voice orders and decentralized continuity review

**Date:** November 11, 2026 (America/Chicago)
**Status:** Source-only pilot in draft PR #1410; not an active speech-to-job service, not merged, and not deployed.

## Why this gate adds no duplicate control plane

The repository already includes:
- `src/noology/neotericMethod.ts`: canonical Noocratic Rules of Order — `MOTION`, `POSTPONE`, `AMEND`, `COMMIT`, `QUESTION`, `TABLE`, `ADJOURN`. This module is not a new source of parliamentary authority.
- `server/neo-platform-api/command-router.mjs`: authenticated read-only platform command interface and existing authorization boundary.
- `server/neo-crawler/redis-queue.mjs`: Redis/Upstash queue with claim/complete/fail, retry/dead-letter; potential reusable pattern, not an independently verified safe general-purpose Chords queue.
- `orchestration/neo-router.yaml`: provider-neutral model routing specification.
- `server/neo-network/fabric.mjs` and `architecture/neo-continuity-fabric-policy.json`: network and failover design; DNS cutover and database promotion require authority.
- `cloudflare/neo-command-board/README.md` and `cloudflare/neo-conversation/README.md`: existing voice-capable command UIs; do not build another speech front end.

## Scope implemented

**Voice-order bridge:** `orchestration/neo-chords/gate-orders.mjs`.

- Recognizes an exact `Next gate` command or a final, separately punctuated `Next gate` following an operator's closing statement, as well as the seven canonical procedural motion names.
- Produces *proposals only*: `verb`, `gateId`, `expectedRevision`, `nextGateId` (when declared), deterministic `orderId`, `escalationRequired`, `executes:false`.
- Requires a caller-supplied verified principal with `chords.gate.propose`. Actual authentication and role verification must occur in a separate trusted ingress service. Never construct `verified:true` directly from user-supplied text.
- Rejects stale revisions, missing next-gate definitions, closed gates and unrecognized phrases. A mention of the words 'next gate' is not permission to act.
- A matching proposal ID helps prevent accidental duplicates, but **does not provide persisted cross-process idempotency**. Persist a unique order ID and compare-and-swap gate revision in the existing operations system before allowing any transition.

**Independence review:** `orchestration/neo-chords/continuity-policy.mjs`.

- Checks externally verified evidence for independent healthy attested compute providers, independently controlled reachable naming routes and encrypted, restore-tested storage copies.
- Treats same-provider replicas as correlated failure, not decentralization.
- Produces **BLOCKED** or **READY_FOR_INDEPENDENT_REVIEW**, never a claim that failover happened or is certified.
- No DNS updates, database primary promotion, credential migration, provider registration or automatic failover.

## Test evidence

`node --test orchestration/neo-chords/gate-orders.test.mjs orchestration/neo-chords/continuity-policy.test.mjs`

13 isolated local Node.js tests passed, 0 failed: 8 voice-order/proposal tests and 5 independence-policy tests. The tests used synthetic data and a supplied mock principal. GitHub CI for the new commit and staging integration are separate pending gates.

## Operator conversation rules

- **Motion**: initiate a matter or workstream.
- **Question**: ask for the evidence needed to decide.
- **Amend**: revise the current work or decision.
- **Commit**: send a matter for authorized inquiry/refinement (not a blind Git commit).
- **Postpone**: defer an issue.
- **Table**: hold without changing state.
- **Adjourn**: close the sitting; this does not create permission for unbounded background work.
- **Next gate**: request advancement to the *next explicitly declared and authorized gate*. Finish current work, preserve results, avoid duplicating existing code, and select an evidence-based next step. Never treat a spoken phrase as authorization to spend, deploy production, sign agreements, modify DNS, or disclose private data.

One ChatGPT message can invoke available connector tools during the active turn; after the chat closes, work continues only if an independently deployed, authorized, persistent scheduler/queue or a scheduled automation exists. A GitHub source commit alone does not create that runtime.

## Gate 3 — remaining proof

1. Bind voice-order proposals to NEOpass/authorized operator sessions and the existing operations control plane using persistent unique order IDs, gate revisions and replay prevention.
2. Reuse or adapt the *existing* durable queue under new namespaced keys, but first test crash recovery, expired leases/fencing and multi-worker concurrency. Do not assume the crawler queue can safely perform at-most-once work across races.
3. Use an existing hosted worker or independently controlled scheduler with least-privilege credentials; validate a **single** read-only provider round trip and explicit spend/usage cap.
4. Verify actual independent compute, DNS and storage evidence and run a failover/restore drill. Preserve the existing continuity controls forbidding unapproved DNS and database promotion.
5. Complete GitHub CI, HTTPS staging, logging and rollback before merging or enabling production.

**Next gate status:** READY TO PROPOSE; external runtime worker authority, credential scope, staging proof and durable authorization remain BLOCKED/UNVERIFIED.
