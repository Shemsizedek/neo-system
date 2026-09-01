# NEO TeraBox Adapter

## Purpose

This adapter connects the NEO System to TeraBox through TeraBox's official Open Platform / OpenAPI surface. It is intended for archive storage, application-managed files, document retrieval, backups, and controlled file exchange.

## Security boundary

- Do not commit TeraBox passwords, session cookies, NDUS values, access tokens, refresh tokens, client secrets, private secrets, or token-store encryption keys.
- Prefer official OAuth/Open Platform authorization over browser-session scraping.
- Keep credentials server-side only.
- Treat download links as temporary/sensitive and avoid logging them.
- The OAuth callback stores access/refresh tokens only through the server-side token-store interface and returns a redacted public summary.

## Current adapter capabilities

`server/storage/terabox/adapter.mjs` currently provides:

- user information
- quota lookup
- directory listing
- recursive filename search
- download-link retrieval
- copy / move / rename / delete file-manager operations
- configurable API and upload domains

The official API documentation states that API and upload domains are returned by TeraBox authorization/token-information services. File operations are scoped to the application-assigned TeraBox directory. The adapter therefore does not assume unrestricted access to the account root.

## Application credentials

Configure these only in the server/deployment secret manager:

```bash
TERABOX_CLIENT_ID=issued-app-key
TERABOX_CLIENT_SECRET=issued-secret-key
TERABOX_PRIVATE_SECRET=issued-private-secret
NEO_OPERATOR_API_TOKEN=high-entropy-operator-bearer-token
TERABOX_LIVE_MODE=read-only
```

Do not place real values in `.env.example`, documentation, source files, GitHub issues, pull-request comments, or commits.

## Token persistence

The runtime defaults to an in-memory token store for development. A durable encrypted file store can be enabled on a persistent Node host with:

```bash
TERABOX_TOKEN_STORE_PATH=/var/lib/neo/terabox/tokens.enc
TERABOX_TOKEN_STORE_KEY=strong-runtime-secret
```

The file store encrypts the complete token record with AES-256-GCM, uses an atomic temporary-file rename, and writes with owner-only permissions (`0600`). `TERABOX_TOKEN_STORE_KEY` must come from the deployment secret manager and must never be committed.

Do **not** use the encrypted-file mode on an ephemeral/serverless filesystem such as a normal Vercel Function deployment. For serverless production, inject a durable secret/KV adapter into `createTeraBoxRuntime({ tokenStore })` so token refreshes survive cold starts and redeployments.

## Gateway routes

The NEO Platform API exposes:

```text
GET /api/v1/storage/terabox/status
GET /api/v1/storage/terabox/auth-url
GET /api/v1/storage/terabox/callback?code=...
GET /api/v1/storage/terabox/user
GET /api/v1/storage/terabox/quota
```

Every TeraBox gateway route requires `Authorization: Bearer $NEO_OPERATOR_API_TOKEN`. The authorization URL creates a cryptographically random, ten-minute, single-use OAuth `state`; the callback must return both `code` and `state`. The callback exchanges the code server-side, performs the read-only health check, stores the token record, and returns only a redacted connection summary.

Live access fails closed unless `TERABOX_LIVE_MODE=read-only`. In this mode only status, authorization, user information, and quota are exposed. Directory listing, recursive search, download links, and every file mutation remain disabled at the gateway.

## Example direct adapter use

```js
import { createTeraBoxAdapter } from './server/storage/terabox/adapter.mjs';

const terabox = createTeraBoxAdapter({ accessToken: process.env.TERABOX_ACCESS_TOKEN });
const files = await terabox.list({ dir: '/From: Other Applications/NEO System-APP_ID/' });
console.log(files);
```

## Production authorization gate

A live connection still requires TeraBox application credentials / authorization issued for the NEO integration. Once authorized, the access/refresh tokens must remain in the configured server-side token store rather than source control or browser storage.

## NEO routing

```text
NEO Services
    |
NEO Gateway / authorized backend
    |
TeraBox OAuth Runtime + Token Store
    |
NEO TeraBox Adapter
    |
TeraBox OpenAPI
    |
Application-scoped NEO storage area
```

GitHub remains the source-code and version-control layer. TeraBox should be treated as bulk/archive and user-file storage, not as a replacement for Git history.
