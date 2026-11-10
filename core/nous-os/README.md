# NEO Nous OS — Core control-plane foundation (Project 144)

This is the first coherent bootable **application runtime** for Nous OS, not a kernel replacing Linux or Android. It provides signature-verified, **plan-only** N.I.A. routing and health telemetry. There is **no live agent execution, wallet signing, payment, publishing, repository mutation, or production deployment** in this gate.

## Existing sources reused, not relocated

- Canonical N.I.A. IDs: `registry/agents.yaml`
- Noological reasoning: `src/noology/neoAlgo.ts` (source inventory only) and `core/neo-algo/runtime.mjs` (bounded, executable **read-only risk classifier**)
- Economic value modeling: `src/noology/nousEconomicValueKernel.ts`
- Social routing: `src/social/rudwaan-nous-bridge.mjs` and `src/social/meta-muse-policy.mjs` (pure read-only policy classifiers)
- Existing Crown workload definitions: `server/crown-workload-agent/` and `.github/workflows/deploy-crown-tier1-agents.yml`

`registry.mjs` reads all canonical IDs from `registry/agents.yaml` at startup and fails closed on malformed records. Only five explicitly mapped agents have planning capabilities. All agents remain metadata-only, not connected processes.

## Identity contract

Provide a trusted Ed25519 token *verification* key (never a signing key), issuer, and audience from protected configuration:

- `NOUS_IDENTITY_PUBLIC_KEY_PEM_BASE64`: base64 PEM-encoded Ed25519 public key
- `NOUS_IDENTITY_ISSUER`: exact trusted issuer
- `NOUS_IDENTITY_AUDIENCE`: exact service audience
- `NOUS_HOST`: defaults to `127.0.0.1`
- `PORT`: defaults to `8080`
- `NOUS_STATE_DIR`: optional writable directory for a single-process append-only planning receipt log; leave unset for ephemeral development
- `NOUS_DATABASE_URL`: optional restricted PostgreSQL connection URI. When configured, atomic durable planning receipts use PostgreSQL rather than the local file. Never commit a connection URI or print it in logs.

The deployed runtime additionally requires `token_use: "nous-read"` and an at-most 120-second signed lifetime. Protected requests use an EdDSA-signed JWT with validated `iss`, `aud`, `sub`, and `exp`; optional `nbf` and `iat` are also checked. Explicit scope `nous.agents.read` is required for agent listing; `nous.task.plan` is required for planning. Unsigned identity headers, generic API keys, and wildcard scopes are rejected. **The live NEOpass service uses HS256 session tokens**, not EdDSA. The opt-in, disabled-by-default exchange adapter is `server/neo-platform-api/nous-token-exchange.mjs`, registered only when `NOUS_TOKEN_EXCHANGE_ENABLED=true` on the GISS API. It verifies existing HS256 sessions **inside NEOpass**, checks active membership, then signs EdDSA Nous tokens for **read-only scopes only**: `nous.agents.read nous.sources.read nous.adapters.read`. It rejects browser/crown-purpose tokens, cookie-based minting, expired sessions and untrusted origins. Configure `NOUS_EXCHANGE_ED25519_PRIVATE_KEY_PEM_BASE64` as a protected GISS-side secret and give Nous OS only the matching public key. Both components must agree on exchange issuer `neo-pass-nous-exchange` and audience `neo-nous`. The private key **must never** be stored in Nous OS or committed to GitHub. 

The exchange has not been enabled in a running service; revocation and key rotation policies remain unverified. Never enable this on production without an identity review and a tested ingress/throttling/revocation plan.

Without the three identity settings, protected APIs fail closed and readiness reports 503.

## Local commands

```sh
node --test core/nous-os/*.test.mjs
node core/nous-os/server.mjs
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/ready
```

For private staging only, set approved environment values and run:

```sh
docker compose -f core/nous-os/deploy/compose.staging.yaml --profile nous-staging up --build
```

The container-only compose service binds `127.0.0.1:18080`. Render is a **publicly reachable** web service, even though `/v1/*` APIs require signed credentials. Do not describe Render staging as private networking. A per-process bounded request gate responds 429 when exceeded, but is **not** distributed ingress rate limiting and cannot distinguish users behind shared proxies.

## API

- `GET /health`: liveness only, not integration readiness
- `GET /ready`: identity verification configuration status; external adapters always remain disabled
- `GET /v1/agents`: protected canonical registry catalog, each listed as `routing_only`
- `GET /v1/adapters`: protected catalog of three local read-only NEO policy adapters, requiring `nous.adapters.read`.
- `POST /v1/adapters/classify`: protected bounded input `{"adapterId":"neo-algo-risk","value":"financial_transfer"}` calls the existing `core/neo-algo/runtime.mjs` *only* for advisory risk classification; social intent and Meta Muse capability classification are also available. No network access or action execution is possible.
- `GET /v1/sources`: protected SHA-256 inventory of the NEO Algo and economic-kernel source files, requiring `nous.sources.read`; source verification is **not execution**
- `POST /v1/tasks/plan`: protected body `{"requestId":"REQ-001","agentId":"NIA-008","capability":"development.plan"}`. Returns a plan receipt with `execution:"disabled"`. When `NOUS_STATE_DIR` is configured, receipt history survives a single-process restart and duplicate request IDs replay their original receipts.

Receipts never mean tasks ran, were queued, or were approved. The dedicated Neon staging project `neo-nous-os-staging` backs `neo-nous-os-db-staging` on Render via a scoped PostgreSQL role. Hosted receipt durability after restart still requires a signed end-to-end test; checking a healthy database alone does not prove that writes or replays work. No task body or credentials are logged. Audit events are stdout only. Optional receipts are hash-chained and fsynced but **not encrypted, multi-writer safe, or independently tamper-proof**. Run only one service replica when persistence is enabled. Persisting request receipts is not a durable task queue.

## Next release gates

1. Independently verify NEOpass issuer, revocation/key rotation, ingress rate limits, token lifetime policy, and replay protection.
2. Verify opt-in NEOpass exchange in **isolated staging**, with issuer/key rotation and revocation checks. Nous now has bounded read-only NEO Algo runtime and social policy adapters; GISD and economic **TypeScript** adapters are not yet executed. Source inventories remain non-executable.
3. Add an encrypted, multi-replica-safe durable queue, append-only independently anchored audit, backup, observability and tested rollback. The current append-only receipt log is a single-process staging primitive.
4. Implement independently approved capability grants for any external actions. Wallet signing and regulated activities require separate authorization and compliance checks.
5. Confirm dedicated GitHub CI, ephemeral loopback container smoke tests, private hosted staging tests, and an approved rollback before any production deployment. No Render service is created or changed by this branch.


## Operational security / rollback

- Both Render services are free-plan, auto-deploy OFF, feature-branch only. The database-backed service is `neo-nous-os-db-staging`; the original `neo-nous-os-staging` remains a locked fallback.
- All requests to `/v1/*` require Ed25519-signed read-purpose authentication; anonymous requests fail closed. Per-instance throttling and response headers add defense in depth, **not** a replacement for trusted ingress/WAF protections.
- Before any real NEOpass exchange, implement rotation, issuer revocation, strong account-state checks, delegated consent, and external ingress limits. No production signing key is authorized in Nous.
- **Rollback:** Keep auto-deploy disabled. If the new staging deployment fails, use Render's previous-successful-deploy rollback in the dashboard; disable identity exchange at the GISS boundary independently. Do not switch production traffic to the locked fallback.
- **Data recovery:** Neon point-in-time restore/history retention is provider-controlled; verify retention, export and restoration in an isolated branch before promising disaster recovery. Do not use ephemeral Render filesystem for production receipts.
- **Outstanding test:** A signed request to the actual hosted Nous service, durable record creation/replay and a subsequent hosted restart; requires a securely delivered test-only token signed by a key authorized on that staging service. No temporary private signing key should be exposed via a public endpoint or repository.
