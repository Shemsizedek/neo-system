# NEO TeraBox Bridge

Production bridge between TeraBox Open Platform and authorized NEO System services.

## Architecture

- GitHub remains the source of truth for NEO code/configuration.
- TeraBox is used as an authorized storage, artifact, archive, and backup bridge.
- NEO Gateway/Router/NEOsync/Oracle remain the orchestration and policy layers.
- Secrets never ship to browser code or GitHub.
- Production writes are approval-gated.

## Required TeraBox developer values

Create/approve an application in the official TeraBox Open Platform and populate:

- `TERABOX_AUTHORIZE_URL`
- `TERABOX_TOKEN_URL`
- `TERABOX_API_BASE`
- `TERABOX_CLIENT_ID`
- `TERABOX_CLIENT_SECRET`
- `TERABOX_PRIVATE_SECRET` if your TeraBox application profile supplies one
- `TERABOX_REDIRECT_URI`
- `TERABOX_SCOPES`

Do not use an `ndus` browser cookie as the production authentication mechanism.

## Local start

```bash
cd services/neo-terabox-bridge
cp .env.example .env
set -a && . ./.env && set +a
node server.mjs
```

Health check:

```bash
curl http://localhost:8080/health
```

## Container

```bash
docker build -t neo-terabox-bridge services/neo-terabox-bridge
docker run --rm -p 8080:8080 --env-file services/neo-terabox-bridge/.env neo-terabox-bridge
```

## Cloud Run production pattern

Build and deploy this directory as a private Cloud Run service. Store TeraBox and NEO credentials in Secret Manager and inject them as environment secrets. Expose only the OAuth callback and any intentionally public health endpoint through the NEO Gateway.

Recommended service name: `neo-terabox-bridge`.

## First production gate

1. Register the exact production callback URL in the TeraBox developer application.
2. Inject all secrets through Secret Manager.
3. Deploy the container.
4. Verify `/health` returns `teraboxConfigured: true` and `neoConfigured: true`.
5. Call `/v1/terabox/connect` with `Authorization: Bearer $NEO_INTERNAL_API_KEY`.
6. Complete TeraBox authorization using the returned `authorize_url`.
7. Verify `/v1/terabox/me` using the returned bridge session.
8. Only then enable artifact sync jobs.

## Production hardening still required before broad public use

The in-memory session store in `server.mjs` is intentionally a bootstrap implementation. Before horizontal scaling, replace it with a persistent encrypted session store such as Firestore/Redis and implement refresh-token rotation, structured audit logging, rate limiting, CSRF/state persistence, and per-operation authorization policy.
