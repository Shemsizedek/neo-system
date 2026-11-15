# Crown Chain NOMNI — Neon HTTPS origin

This directory rebuilds the **exact** publicly designated NOMNI HTTP payloads from the GitHub-tracked, issuer-approved source tree `server/crown-metadata/attachments/NOMNI`. No on-chain issuance, ownership, supply, or description change is involved.

**Deployed Neon Functions origin**
- Project: `neo-crown-https-origin` (`morning-bird-76329989`), AWS `us-east-1`
- Branch: `br-long-bar-bb08d343` (main)
- Function slug: `crownmetadata`
- Custom hostname: `crown.holytemples.org`
- DNS (WordPress authoritative): `crown CNAME fn-custom-domains.us-east-1.aws.neon.tech.` TTL 300
- Independent origins: `https://shemsizedek.github.io/neo-system/crown-chain/`, `https://neo-crown-nomni-mirror.onrender.com/assets/NOMNI/tokenscan.json`, `https://holytemples.org/crown-chain/`

The function responds with HTTP 200 and Content-Type application/json for:
- `/assets/NOMNI/tokenscan.json`
- `/assets/NOMNI/info.json`
- `/assets/NOMNI/bill-1.json`

It also serves the original issuer-provided JPEG at `/assets/NOMNI/nomni-bill-1.jpg`. The source-build checks JSON aliases, asset ID `6195210`, artwork byte count and SHA-256 `00472d01de84f4d876d7cd6ca1fa53a844a0b7929f93f97cd5dfb4c28e7bb7e6`, and rejects inconsistent data. The deployment also checks the artwork digest at module startup.

## Reproduce the deployment from a trusted build machine

```bash
node server/crown-metadata/neon-origin/build.mjs
node --test server/crown-metadata/neon-origin/handler.test.mjs
# Requires an authenticated Neon CLI session with permission to deploy to this project:
neon functions deploy crownmetadata --project-id morning-bird-76329989 --branch br-long-bar-bb08d343 --src server/crown-metadata/neon-origin/dist/index.mjs --no-bundle --wait
```

Do not commit generated `dist/` artifacts, API keys, database credentials or wallet secrets. The Neon Functions service does **not** access the private database, and the database remains configured with public connections blocked. It serves a snapshot of public source records, so updating metadata requires rebuilding, testing and deploying a new function bundle.

## Acceptance and restoration

1. Neon custom-domain state is `active`, `dns_status: ok`, `binding_status: present`.
2. The exact on-chain URL `https://crown.holytemples.org/assets/NOMNI/tokenscan.json` returns HTTP 200 (no 3xx) with parseable `application/json` and asset name NOMNI.
3. The JPEG returns HTTP 200, is 215,295 bytes and matches the recorded SHA-256.
4. NEO System Health Agent monitors the canonical URL, the independent mirrors, and TokenScan.
5. A blank TokenScan information tab **does not** mean the Crown HTTP origin is down once checks 1–3 pass. The explorer may need an independent metadata-import refresh, which is not controlled by this repository.

The previous Render workspace can remain suspended without affecting the Neon-origin custom domain; do not switch the CNAME back merely because its old Render service resumes.
