# Holy Temples read-only Cloud Run service

This package runs `server/holytemples-adapter/server.mjs` as a standalone read-only service.

## Contract

- `GET /health`
- `GET /library`
- `GET /library/:assetId`
- Library mutation methods fail closed with `405 Method Not Allowed`.
- No WordPress writes.
- No Google Drive writes.
- No checkout, custody, payout, or settlement execution.

## Build locally

From the repository root:

```sh
docker build -f deploy/holytemples-readonly/Dockerfile -t holytemples-readonly .
docker run --rm -p 8080:8080 holytemples-readonly
```

Then verify:

```sh
curl -fsS http://127.0.0.1:8080/health
curl -fsS http://127.0.0.1:8080/library
curl -fsS http://127.0.0.1:8080/library/world-library-neo-codex
```

## Cloud Run deployment gate

Production deployment is intentionally separate from this packaging change. After CI and container smoke validation pass, deploy through the NEO System's authenticated GCP path in `us-central1` and verify the same three GET requests against the resulting Cloud Run service URL before connecting any public Temple surface.
