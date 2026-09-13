# NEO Opal Bridge

Universal intake and delivery control plane for Google Opal mini-apps entering `Shemsizedek/neo-system` and the `holytemples.org` hosting namespace.

## Production host

`https://opal.holytemples.org`

## Lanes

1. **Opal link registration** — register a share/edit URL and target HolyTemples host when source export is unavailable.
2. **Artifact delivery** — submit generated/exported source files and receive a normalized `neo.opal.delivery.v1` manifest for repository placement and deployment preparation.

The bridge deliberately does not claim direct source extraction from Google Opal. Direct provider pull remains disabled until an authenticated, documented Opal export/API surface is configured.

## Endpoints

- `GET /health`
- `GET /api/opal/status`
- `POST /api/opal/prepare`

`POST /api/opal/prepare` requires `Authorization: Bearer <NEO_OPAL_BRIDGE_TOKEN>` and `X-NEO-Approved: true`.

### Example

```json
{
  "name": "Video Marketer",
  "opalUrl": "https://opal.google/app/EXAMPLE",
  "targetHost": "video.holytemples.org",
  "files": [
    {"path":"index.html","content":"<main>...</main>"}
  ]
}
```

The returned manifest standardizes the delivery branch, app root, deploy root, host registry location, target host, source files, and production controls.

## Security boundary

Only `*.holytemples.org` targets are accepted. Repository writes and deployments remain approval-gated. Secrets are runtime-only and must never be included in Opal source payloads.
