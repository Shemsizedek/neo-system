# NEO Relations runtime deployment

GitHub remains the source of truth. Vercel is an HTTPS compute host only.

## Required Vercel project

Create/import one project for `apps/neo-relations/runtime` and keep its root directory scoped to that path.

Required production environment variables:

- `DATABASE_URL`
- `RELATIONS_JWT_ISSUER`
- `RELATIONS_JWT_AUDIENCE`
- one of `RELATIONS_JWKS_URL` or `RELATIONS_JWT_SECRET`
- optional `PGSSL=disable` only for trusted local/private database environments

The runtime health endpoint must report `executionWorker: false` until a later execution-worker gate is explicitly approved.

## GitHub Actions secrets

The production deployment workflow expects:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_RELATIONS_PROJECT_ID`
- `RELATIONS_DATABASE_URL` only when running migrations from GitHub Actions

No database, JWT, Vercel, or Discord runtime credentials may be placed in GitHub Pages assets.

## Deployment order

1. Provision the Vercel project and PostgreSQL database.
2. Configure production runtime environment variables in Vercel.
3. Add the GitHub Actions deployment secrets.
4. Run `Deploy NEO Relations Runtime` with migrations enabled for the first production release.
5. Confirm `/health` returns HTTP 200 and `executionWorker: false`.
6. Create scoped service tokens for Router and read-only Discord approval visibility.
7. Configure Discord runtime `RELATIONS_API_BASE` and read-only `RELATIONS_API_TOKEN`.
8. Verify create intent → audit → pending approval read → human decision → audit before enabling any execution worker.
