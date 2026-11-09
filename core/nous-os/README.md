# NEO Nous OS — Core control-plane foundation (Project 144)

This is the first coherent bootable **application runtime** for Nous OS, not a kernel replacing Linux or Android. It provides signature-verified, **plan-only** N.I.A. routing and health telemetry. There is **no live agent execution, wallet signing, payment, publishing, repository mutation, or production deployment** in this gate.

## Existing sources reused, not relocated

- Canonical N.I.A. IDs: `registry/agents.yaml`
- Noological reasoning: `src/noology/neoAlgo.ts`
- Economic value modeling: `src/noology/nousEconomicValueKernel.ts`
- Social routing: `src/social/rudwaan-nous-bridge.mjs`
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

Protected requests use an EdDSA-signed JWT with validated `iss`, `aud`, `sub`, and `exp`; optional `nbf` and `iat` are also checked. Explicit scope `nous.agents.read` is required for agent listing; `nous.task.plan` is required for planning. Unsigned identity headers, generic API keys, and wildcard scopes are rejected. **The real NEOpass issuer and key format remain unverified**; do not claim integration until its signing and rotation contracts are proven.

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

The service binds `127.0.0.1:18080` on the staging host; never publish the port to the public Internet without a separate hardened authenticated ingress.

## API

- `GET /health`: liveness only, not integration readiness
- `GET /ready`: identity verification configuration status; external adapters always remain disabled
- `GET /v1/agents`: protected canonical registry catalog, each listed as `routing_only`
- `GET /v1/sources`: protected SHA-256 inventory of the NEO Algo and economic-kernel source files, requiring `nous.sources.read`; source verification is **not execution**
- `POST /v1/tasks/plan`: protected body `{"requestId":"REQ-001","agentId":"NIA-008","capability":"development.plan"}`. Returns a plan receipt with `execution:"disabled"`. When `NOUS_STATE_DIR` is configured, receipt history survives a single-process restart and duplicate request IDs replay their original receipts.

Receipts never mean tasks ran, were queued, or were approved. No task body or credentials are logged. Audit events are stdout only. Optional receipts are hash-chained and fsynced but **not encrypted, multi-writer safe, or independently tamper-proof**. Run only one service replica when persistence is enabled. Persisting request receipts is not a durable task queue.

## Next release gates

1. Independently verify NEOpass issuer, revocation/key rotation, ingress rate limits, token lifetime policy, and replay protection.
2. Connect an actual authorized NEOpass token exchange, then add scoped read-only NEO Algo, GISD and economic adapters. Source SHA-256 inventories are available now; they do not execute those modules.
3. Add an encrypted, multi-replica-safe durable queue, append-only independently anchored audit, backup, observability and tested rollback. The current append-only receipt log is a single-process staging primitive.
4. Implement independently approved capability grants for any external actions. Wallet signing and regulated activities require separate authorization and compliance checks.
5. Confirm CI, staging smoke tests and operator-approved promotion before any production deployment.
