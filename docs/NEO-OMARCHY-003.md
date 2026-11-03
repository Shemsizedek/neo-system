# NEO-OMARCHY-003 — Agent Enrollment, Scoped Leasing & Verifiable Audit (Simulation)

**Date:** 2026-11-03  
**Status:** Draft source gate, not production-capable.  
**Dependency:** stacked on `feat/neo-omarchy-002` (PR #1329), which itself depends on `feat/neo-omarchy-001` (PR #1326).

## Goal

Design and test the next trust boundary for an Omarchy-based NEO agent fleet without fabricating operational credentials, enrolling real devices or exposing remote agent execution.

## What this gate actually builds

- `server/neo-omarchy/coordination.mjs`: an **in-memory, simulation-only** coordination engine.
  - Explicit `mode: 'simulation'`; production construction is rejected.
  - Random one-time challenge with a 120-second expiration.
  - Injected NEOpass-proof verification **interface** bound to requested machine, challenge and audience. The real NEOpass issuer/verifier is **not connected**. Test doubles cannot be treated as real identity authority.
  - Distinct injected operator authorization step for machine approval/revocation and task queueing. A verified NEOpass assertion alone never authorizes execution.
  - Only `local-inference` tasks; token limits and bounded task size. No shell, browser, arbitrary connector, Bitcoin signer, trade, payment, secret manager or host administration privileges.
  - One active lease per machine, 30-second lease TTL and no automatic task replay after expiry. Lost/expired/revoked work is `needs-review` rather than reissued.
  - In-memory SHA-256 chained audit metadata; a separate chain verifier detects alteration. This is **tamper-evident within the captured snapshot**, not tamper-proof, persistent, trusted time-stamped, independently signed or anchored to Crown Chain.
  - Explicit blocked state for unapproved or revoked machines.
- `server/neo-omarchy/outbound-worker.mjs`: a transport-neutral **outbound-only callable worker**, requiring injected functions `pollLease`, `invokeLocalInference`, and `submitReceipt`. It does not open a listener or call any real remote system; it rejects task payloads containing unrecognized instructions, tools or actions. It returns the SHA-256 digest of a result, not the result itself. The task prompt is passed only into the locally injected inference callback.
- `server/neo-omarchy/coordination.test.mjs`: deterministic synthetic contracts for challenge replay, false proofs, separate approvals, scope limits, duplicate/expired leases, revocation, outbound execution and tamper detection.
- `.github/workflows/neo-omarchy-003.yml`: unprivileged GitHub test runner; no system install, live NEOpass login, model download, external execution or production secrets.

## Simulated protocol

```text
Operator simulation (no external network)
  ├── issue machine challenge (nonce + TTL)
  ├── injected verifier: mocked NEOpass issuer + nonce binding
  ├── operator approval: separate mocked role/permission verifier
  ├── queue explicit read-only inference objective
  └── leaseNext(machineId) -> 30s capability-limited lease
                                |
                                v
                        Outbound worker contract
                        ├── poll approved lease
                        ├── validate lease strictly
                        ├── call injected local inference function
                        └── report SHA-256 result digest + outcome
                                |
                                v
                        Coordinator audit chain
                     SHA-256(previous hash + event)
                         (no blockchain anchor)
```

No actual HTTP coordinator endpoint, HTTPS transport, broker, persistent datastore, machine certificate or remote credential exists in Gate 003. "Outbound-only" means this worker exposes no listener and calls only injected outbound transport functions; there is no scheduled network polling.

## Security / operational posture

1. NEOpass is **not** a live trust root in this PR. The verifier callback is a contract to be implemented only against an independently confirmed issuer, key rotation rules, audience, nonce/replay protection, expiry and revoked-device registry. Never accept unsigned JSON as NEOpass identity.
2. Machine approval and queue authorization require distinct independently verified operator permissions; a challenge or shared token is not sufficient.
3. Gate 002's bearer token is a localhost lab credential, **not** a production machine identity. Do not reuse it to enable this coordinator on the Internet.
4. SHA-256 audit chaining does not establish authorship or independent timing; persistence, independent witnesses, confidential-data redaction review, signature validation, off-host backups and Crown Chain evidence integration must be demonstrated before evidentiary claims.
5. No asynchronous swarm, automatic replay, trading, payment, wallet access, remote command execution, OS installation or public service is activated.
6. Omarchy remains an optional dedicated Linux workstation environment. Do not alter existing production infrastructure or reintroduce Cloudflare as a NEO dependency.

## Testing

The test runner can execute this gate with synthetic data:

```bash
node --test server/neo-omarchy/coordination.test.mjs
node --test server/neo-omarchy/lab-bridge.test.mjs
node --test scripts/neo-omarchy-preflight.test.mjs
```

No hardware or network authority is needed for these unit/contract tests.

## Acceptance criteria for Gate 003

- Source tests and GitHub CI pass.
- Gate 001 and 002 source review is resolved in order; no silent merge or production update.
- Exported audit events verify internally and cannot be mislabeled as signed or on-chain evidence.
- Unsupported capabilities, replay, wrong identity, expired leases and revoked identities are rejected.
- Hardware, issuer trust, device approval, encrypted persistent datastore, TLS/identity-bound transport, remote service, real Ollama inference and NEOpass enrollment remain **unverified release blockers**.

**Release decision:** source-only design ready for review; production deployment and live machine enrollment **BLOCKED**.

**Next Gate — NEO-OMARCHY-004:** implement a private authenticated coordinator with verified NEOpass issuer binding and device revocation, transactional persistent task leases, secure outbound TLS transport, signed/independently archived evidence receipts, and one authorized lab-host end-to-end run. Require review of each dependency before enabling agents.
