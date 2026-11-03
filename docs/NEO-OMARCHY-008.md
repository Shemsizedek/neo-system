# NEO-OMARCHY-008 — Neon Staging, Canonical Audit Ledger and First-Mission Gate

**Date:** 2026-11-03
**Status:** a live **isolated Neon database project and staging branch exist**; canonical v2 audit schema applied to the branch. GitHub PR remains draft. **No Omarchy host, real NEOpass issuer, Render compute service or actual Ollama task is deployed.**

## Real infrastructure created

- Connected Neon organization: the user's existing free-plan organization, no customer financial databases touched.
- Project name: `neo-omarchy-staging`
- Neon project ID: `late-firefly-69326747`
- Region: `aws-us-east-1`; PostgreSQL 17; configured 0.25 CU ceiling.
- Default branch: `main` (`br-solitary-fire-bc2ew2x7`), left free of Omarchy schema mutations.
- Dedicated staging branch: `gate-008-staging` (`br-autumn-snow-bcr8i34p`).
- **Public database connections blocked** after staging schema initialization. The protected network setting also means a Render application cannot connect directly until a separately reviewed private or TLS/IP-restricted connectivity method is configured. No connection string or secret was committed to GitHub.
- Canonical `neo_omarchy.audit_v2` table, append-only trigger and rehashable columns were created in the Neon staging branch through a non-destructive SQL transaction. To permit the connector's SQL migration call, public connectivity was temporarily enabled on the new isolated project, then immediately blocked again. There were no customer records or other applications in this project.
- This v2 migration does **not** populate earlier Gate 004–006 coordination tables or migrate legacy audit history; those migrations are pending explicit staged deployment review. A new audit_v2 ledger can now hold events, but **no live issuer or worker is currently writing to it**.

## Code changes

1. `server/neo-omarchy/postgres-008.sql`:
   - Introduces a **separate v2 audit table** containing integer sequence, event type, subject, bounded JSONB metadata, UTC epoch-millisecond timestamp, previous digest, current SHA-256 digest, and the **exact canonical record text**.
   - Unique predecessor and event hashes reduce accidental forks.
   - Trigger refuses UPDATE and DELETE. Database owners may still bypass trigger protections; independent/off-host witness and restricted roles are mandatory before evidentiary reliance.
2. `server/neo-omarchy/canonical-ledger-008.mjs`:
   - Canonical JSON normalization with sorted fields and strict metadata allowlist (no passwords, signing keys, prompts, wallet data or model outputs).
   - Single-chain append through parameterized SQL, explicit transactions and advisory transaction locking.
   - **Full independent rehash verification** of each v2 event by reconstituting the canonical record from persisted fields, not merely checking previous-hash links.
   - Compact non-secret snapshot receipt with event count, head hash and deterministic snapshot digest.
   - External witness **signature verification contract**, requiring a trusted pinned Ed25519 public key. A verified signature proves cryptographic authorship, *not* organizational independence, secure custody or a Crown Chain transaction.
   - The historical v1 PostgreSQL `audit_events` rows are **not** migrated or falsely upgraded to fully reproducible hashes.
3. `server/neo-omarchy/mission-certification-008.mjs`:
   - Fail-closed status ledger requiring evidence of approved hosting, an actual NEOpass issuer, physical or VM device authorization, authentic device attestation, real TLS/mTLS, restored database, real local model response, reviewed independent witness, operator approval and financial capabilities disabled.
   - Caller-supplied readiness booleans do **not** promote a service or certify a device; `productionReady` and `promotable` remain false until a separate signed release workflow is implemented.
4. `server/neo-omarchy/gate-008.test.mjs`: deterministic canonicalization and witness tests; actual disposable PostgreSQL 17 insertion/concurrency, rehash, tamper detection and immutable-row enforcement.
5. `.github/workflows/neo-omarchy-008.yml`: Node 24, disposable PostgreSQL 17, dedicated and regression suites. It does **not** access the connected Neon project or any live credentials.

## Render deployment selection

Two Render workspaces were returned by the connector:
- `NEO workspace` — `tea-db8bbpij9qps73cb7gb0`
- `NEO SYSTEM` — `tea-dbhtkc8473hc73933img`

The Render connector requires the owner to **explicitly confirm which workspace** before inspecting or creating resources. No selection was supplied in this gate, so **no Render service was created and capacity/billing cannot be asserted**.

Use **private service** (`pserv`) for a network-listening coordinator, not a public web service; private services typically require a paid Render plan. Validate workspace capacity, service plan, architecture and authentication before provisioning. Configure Neon-to-Render access through verified secure database networking, secrets and least-privilege roles; the branch currently blocks public connections. Do not open an unauthenticated public database or expose the Omarchy listener.

A ChatGPT conversation is not a persistent compute host, TLS endpoint or hardware substitute. GitHub Actions supplies **bounded disposable CI jobs** for code verification, not a permanently running authenticated NEO agent.

## First authenticated compute mission — operational criteria

- NEO operator approves one real Omarchy host, verifies its image and installs a license-reviewed Ollama model, bound to loopback.
- An authoritative NEOpass issuer independently confirms compatibility with Gate 006's device-bound signature schema, issuer key and revocation policy. CI synthetic issuer signatures are *not* live credentials.
- One verified device is enrolled into the dedicated staging database with proof of possession and independent operator approval. No private keys enter a GitHub commit.
- A reviewed private host and TLS/mTLS transport establish one signed machine request and task receipt. Predecessor Gate 007's loopback test is not network deployment.
- Persist digest-only mission events to the canonical audit_v2 ledger, verify every hash, then request an external witness signature from an independently controlled verified identity.
- A human reviewer verifies the release evidence and rollback before any scope expansion. No crypto, finance, wallet, payment, shell or unrestricted agent execution is enabled.

## Release decision

- **Neon staging project/branch: created.**
- **Canonical v2 audit schema: created in isolated Neon branch.**
- **Code/CI:** report dedicated and repository-wide results separately after they finish.
- **Render:** workspace selection, capacity and private compute provisioning pending.
- **Live Omarchy/NEOpass/Ollama mission:** not performed.
- **Production release:** blocked.

**Next Gate — NEO-OMARCHY-009:** owner-confirmed Render workspace, dedicated staging service and authenticated Neon connection, authority-issued NEOpass machine credentials, real Ollama local-inference pilot and independently witnessed canonical audit evidence.
