# NEO-OMARCHY-005 — Authenticated staging coordinator and real PostgreSQL test

Date: 2026-11-03
Status: stacked development branch, no real device enrolled; no production promotion.

## Chain of custody / integration sequence

This change is stacked on `feat/neo-omarchy-004` (PR #1332), which depends on PRs #1331, #1329 and #1326. Review and merge them in dependency order. A passing staging source build is not approval to modify live NEO services.

Gate 004 source and overall CI completed successfully. No dedicated Omarchy Neon database exists in the connected project list as of this gate. A Render workspace has not been confirmed, so no Render service was inspected or deployed.

## Implemented

- `operator-approval.mjs`: Ed25519 signed approval verifier. Enforces exact issuer key ID, staging-only audience and environment, operator principal, action/target/scope and short lifetime. External revoked-key registry is injected; unknown revocation status fails closed. The code does not generate operator credentials or designate an actual production NEOpass authority.
- `postgres-005.sql`: **non-auto-applied** schema upgrade with a machine signing public key and durable, unique machine/operator replay records. Keys must be bound to real NEOpass enrollment by a reviewed independent process. No such process is deployed yet.
- `trust-store.mjs`: PostgreSQL allowlist for approved, unexpired machines and Ed25519 public keys. Consumes machine and operator nonces through unique database constraints, resisting replay across process restart.
- `staging-coordinator.mjs`: process-level coordinator with signed request verification, machine key lookup, 10-second freshness window, durable nonce consumption before task execution, one read-only capability, signed short-lived server responses, and explicit operator-approved task queueing or device revocation. A local HTTP test server binds **only to 127.0.0.1**, exposes no administrative enrollment path, and does not start automatically.
- `gate-005.test.mjs`: cryptographic contract tests plus PostgreSQL integration scenarios. The database test requires the named disposable database `neo_omarchy_ci` and resets its `neo_omarchy` schema. **Never supply a production, live Neon, or persistent customer database URL.**
- `.github/workflows/neo-omarchy-005.yml`: fresh GitHub Actions PostgreSQL 16 service per PR run, temporary `pg` client installed in CI only, and regression checks of earlier gates.

## Workflow covered by ephemeral PostgreSQL

1. Generate **test-only** Ed25519 keys in the CI runner. Insert two synthetic approved machine rows with their test public keys into an isolated database (not a claim of real NEOpass registration).
2. Verify and consume a short-lived signed operator approval once before queuing one harmless inference task.
3. Poll for a task through cryptographically signed machine request envelopes; the coordinator resolves the machine key from PostgreSQL, not the caller.
4. Serialize assignment through the Gate 004 PostgreSQL advisory lock; only one machine gets the approved task.
5. Consume a persistent one-use request nonce and reject the same request after reconstructing coordinator objects.
6. Accept one signed completion digest only; reject subsequent completions, revoked machines, unapproved actions and malformed signatures.
7. Verify linked audit-event metadata within the disposable test schema. This is **not** an independent witness, on-chain anchoring, signed database audit or certified external evidence record.
8. Exercise a loopback-only local HTTP server and reject unsigned calls. **No production TLS listener or private remote coordinator is deployed.**

## Boundary with NEOpass, Render, Neon and real Omarchy hosts

- NEOpass remains the intended issuer and policy authority. Gate 005 **does not implement live NEOpass certificate issuance, machine-key binding, passkey login, or signed credential revocation from its authoritative service**. Its tests use synthetic keys and seeded machine records.
- The transport contract still expects an approved internal HTTPS origin and a pinned server key. CI connects the signature protocol to an in-process adapter; that is **not** a live HTTPS/mTLS deployment. A future real deployment needs host-name verification, TLS peer identity, network/firewall ACLs, private DNS, authenticated operator access, rate limits, secret vault and monitored rotation.
- No Neon project, Render service, live database, model, Omarchy device, worker process, or NEO production route was created or modified.
- No unbounded loop, swarm, hosted Ollama inference, shell execution, wallet signing, financial movement, or blockchain record was performed.

## Current gate release criteria

The dedicated GitHub CI must pass syntax tests, isolated real PostgreSQL transaction integration, signed operator scope/expiry, replay/duplicate denial, machine revocation and prior-gate regression. The source can then move to review; **production deployment remains blocked** until all below are demonstrably available:

- Real NEOpass issuer key and device-key ownership binding (not CI test keys)
- Authenticated human operator role and revocation source
- Dedicated staging PostgreSQL with approved least-privilege grants, backup-and-restore and no production data
- Operator-selected Render workspace or other approved private host; TLS/mTLS and network isolation
- Actual Omarchy device approved and provisioned with verified image and licensed Ollama model
- One harmless real local inference, recorded with independent evidence and operator observation
- No silent Cloudflare reliance for NEO deployment, no public local-model endpoint

## Next Gate — NEO-OMARCHY-006

Resolve live issuer and deployment prerequisites; provision *one* isolated nonproduction Omarchy node and private staging coordinator only after explicit infrastructure selection. Run independent NEOpass device attestation, credential revocation, PostgreSQL backup/recovery and authenticated Ollama inference certification. Gate 005 alone does not justify production promotion.
