# NEO Counter — Cloudflare Worker + D1

This is the preferred free hosted backend for NEO Counter while GitHub remains the source-of-truth and GitHub Pages remains the development/demo frontend.

## Architecture

- Worker: `neo-counter-api`
- D1 binding: `DB`
- D1 database: `neo-counter`
- Allowed browser origin: `https://shemsizedek.github.io`
- Frontend endpoint variable: GitHub repository variable `NEO_COUNTER_SYNC_ENDPOINT`

## GitHub Actions credentials

Add repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` — scope it to the required Workers/D1 resources only.

Do not commit either value.

## Worker secrets

Set these with Wrangler/Cloudflare secret management, never in Git:

- `NEO_COUNTER_API_KEY_HASH` (optional administrative bootstrap hash)
- `NEO_COUNTER_TERMINALS_JSON`
- `NEO_COUNTER_STAFF_JSON`

Terminal secrets and staff PINs are represented by SHA-256 hashes in the JSON configuration; raw credentials must not be stored in the repository.

## Deploy

The GitHub workflow `.github/workflows/neo-counter-cloudflare.yml` applies `schema.sql` to the remote D1 database and deploys the Worker when Cloudflare backend files change on `main`. It can also be run manually.

After the Worker is deployed and `/health` returns OK, set the GitHub repository variable `NEO_COUNTER_SYNC_ENDPOINT` to the Worker origin (for example `https://neo-counter-api.<account>.workers.dev`). The existing GitHub Pages workflow injects that endpoint into the NEO Counter frontend build.

## API compatibility

The Worker preserves the NEO Counter client contract:

- `GET /health`
- `POST /session`
- `GET /session/me`
- `DELETE /session`
- `GET /merchant/:merchantId/snapshot`
- `POST /sync`
- `GET /merchant/:merchantId/events`
- `POST /merchant/:merchantId/events`

The backend stores merchant state, sessions, and append-only events in D1. It does not store Bitcoin private keys, seed phrases, signing material, or raw cardholder data.
