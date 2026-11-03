# NEO-OMARCHY-006 — Device-Bound NEOpass Enrollment & First-Node Pilot Contract

Date: 2026-11-03
Status: development draft, opt-in local pilot; **not a live service or authenticated real-world NEOpass enrollment**.

## Baseline and dependency

Gate 005 PR #1333 and its repository-wide CI completed successfully. This gate is stacked on `feat/neo-omarchy-005` and depends on GitHub PRs #1333, #1332, #1331, #1329, and #1326 in that order. Do not deploy or merge them out of order. The prior gates' design-only proof interfaces must not be confused with production NEOpass credentials.

## New code

- `device-attestation-006.mjs`: proposes an exact **NEOpass-signed, device-public-key-bound proof**. The issuer Ed25519 public key must be independently pinned and operator reviewed. The signature binds machine ID, one-use challenge, scope, short expiry, proof ID and the **SHA-256 fingerprint of the enrolled device's Ed25519 public key**. A second Ed25519 signature proves the enrolling device holds the matching private key. Explicit revocation lookup returning `false` is mandatory. The real NEOpass issuer has **not been shown to issue this new proof format**; this is a proposed integration contract, not an implementation of official live NEOpass issuance.
- `postgres-006.sql`: draft migration for unique, one-use, 120-second enrollment challenges in the dedicated `neo_omarchy` schema. It does **not** automatically alter any database.
- `device-enrollment-006.mjs`: internal transaction-safe enrollment with a freshly generated challenge, proof verification, independent short-lived signed operator approval (Gate 005), unique persistent operator-approval nonce, device credential state and hash-linked audit event. Uses PostgreSQL transaction serialization. Does not expose an HTTP enrollment endpoint; caller authentication and trusted verifier injection are required before real use. Device private keys are never stored or logged.
- `scripts/neo-omarchy-pilot-006.mjs`: manually invoked **one-shot** local Ollama inference, only on an Omarchy host passing Gate 001 preflight. Requires explicitly set `NEO_OMARCHY_PILOT_ENABLED=1`, `NEO_OMARCHY_MODEL_APPROVED=1`, a reviewed model name, and **literal IPv4 loopback** Ollama origin. No prompt, response, token, secret or wallet material is printed. Returns response digest and elapsed time, but **no independent hardware, model-license or issuer attestation**. The approval flag alone does not prove licensing.
- `gate-006.test.mjs`: cryptographic negative tests and an isolated real-PostgreSQL round trip: device-bound signed proof → unique enrollment challenge → signed operator approval → allowlisted key lookup → signed coordinator lease → simulated local model response → hashed receipt → revocation. The CI's device and issuer keys are generated **only in the test runner** and cannot be used to enroll actual hardware.
- `.github/workflows/neo-omarchy-006.yml`: unprivileged GitHub Actions integration tests using a **disposable** PostgreSQL 16 service. No live Neon/Render, wallet, DNS, TLS certificate, OpenClaw, Omarchy installer or production resource is touched.

## Manual operator pilot after a real Omarchy workstation is installed

Preconditions: a dedicated approved computer or isolated VM, verified Omarchy upstream image, known rollback/backup, Node 24, Git, Ollama installed on loopback, and an operator-reviewed license-compatible model. The official Omarchy installer can erase/repartition disks; **no installation or firmware changes are executed by this gate.**

On that host, from the checked-out Gate 006 branch:

```bash
git fetch origin
git checkout feat/neo-omarchy-006
node scripts/neo-omarchy-preflight.mjs --json
export NEO_OMARCHY_PILOT_ENABLED=1
export NEO_OMARCHY_MODEL_APPROVED=1
export OLLAMA_BASE_URL=http://127.0.0.1:11434
export OLLAMA_MODEL=your-reviewed-installed-model
node scripts/neo-omarchy-pilot-006.mjs
```

This runs **one** harmless local inference request and returns a digest. It does **not** install a model, start Ollama, open a port, schedule an agent or connect to a remote NEO service. Do not upload a private key, enrollment proof or live credential to a public PR, issue or chat. The output remains an operator-generated preliminary evidence item, not an independently witnessed or Crown Chain anchored receipt.

## Strict blockers to actual network deployment

1. Obtain a signed NEOpass issuer declaration of the device-proof schema, approved pinned/rotatable public keys, device registration process, challenge expiration, revocation semantics, and operator permissions. No NEOpass signing key, live issuer or authorized device has been connected in Gate 006.
2. Deploy a **dedicated** nonproduction database with appropriately restricted privileges, encryption, backups and restore drill. Apply Gate 004–006 migrations only after previewing effects and validating the target. The connected Neon inventory currently has no project named Omarchy; **do not reuse financial or unrelated databases**.
3. Select and verify an approved Render workspace or another approved private host. No Render workspace is confirmed for this gate. The Gate 005 HTTP test listener binds only to loopback; a remote service needs independently verified TLS/mTLS identity, private network transport, replay policy and operations controls.
4. Identify a real owned Omarchy machine, validate official distribution and model license, and run the manual preflight plus local inference. The CI suite uses synthetic keys and synthetic model output; it does not provide evidence of a physical node.
5. Before any production pilot, certify the machine's NEOpass proof issued by the real authority, actual device-key possession, operator signing key custody, live revocation and successful database recovery, and independently archived and witnessed audit records.
6. Keep all NEO financial, Bitcoin, NOMNI, payment, wallet, custodian, investment, privileged shell and production actions **disabled** for this agent. Do not conflate a model output digest with an authorization signature or financial settlement.

## Release decision

Source-only release candidate: evaluate CI before asserting ready for review. Live NEOpass enrollment, remote private coordinator, actual Omarchy host and real Ollama task remain unverified.

**Next Gate — NEO-OMARCHY-007:** resolve owner-approved infrastructure and issuer constraints; run signed real-device enrollment against certified staging, verify private TLS/mTLS, prove Postgres backup/restore and independent evidence custody, and perform one harmless end-to-end Ollama task on an authorized machine. Gate 006 source CI cannot certify that operation.
