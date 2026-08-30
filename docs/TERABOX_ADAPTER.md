# NEO TeraBox Adapter

## Purpose

This adapter connects the NEO System to TeraBox through TeraBox's official Open Platform / OpenAPI surface. It is intended for archive storage, application-managed files, document retrieval, backups, and controlled file exchange.

## Security boundary

- Do not commit TeraBox passwords, session cookies, NDUS values, access tokens, refresh tokens, client secrets, or private secrets.
- Prefer official OAuth/Open Platform authorization over browser-session scraping.
- Keep credentials server-side only.
- Store access tokens in secret/environment storage (`TERABOX_ACCESS_TOKEN`).
- Treat download links as temporary/sensitive and avoid logging them.

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

## Environment

```bash
TERABOX_ACCESS_TOKEN=replace-with-oauth-access-token
```

Do not place a real token in `.env.example`, documentation, source files, GitHub issues, or commits.

## Example

```js
import { createTeraBoxAdapter } from './server/storage/terabox/adapter.mjs';

const terabox = createTeraBoxAdapter();

const files = await terabox.list({
  dir: '/From: Other Applications/NEO System-APP_ID/',
});

console.log(files);
```

## Production authorization gate

A live connection still requires TeraBox application credentials / authorization issued for the NEO integration. Once authorized, the resulting access token and TeraBox-provided API/upload domains should be injected through the deployment secret manager rather than source control.

## Proposed NEO routing

```text
NEO Services
    |
NEO Gateway / authorized backend
    |
NEO TeraBox Adapter
    |
TeraBox OpenAPI
    |
Application-scoped NEO storage area
```

GitHub remains the source-code and version-control layer. TeraBox should be treated as bulk/archive and user-file storage, not as a replacement for Git history.
