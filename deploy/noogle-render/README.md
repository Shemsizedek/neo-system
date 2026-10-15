# NSEC-081 — Render staging (NO production credentials)

This temporary **public, read-only** Noogle Connect preview does not proxy to protected Cloud Run, read production databases, or use NEO Pass keys. Existing `noogle.holytemples.org` DNS, search and Google Cloud stay unchanged.

After merging, sign in to Render and create a Blueprint from the `Shemsizedek/neo-system` GitHub repository using root `render.yaml`. Review the **free** plan, no other services, and the deployment settings before approving. Render assigns an actual `*.onrender.com` URL at provisioning; do not assume any address before provisioning.

The service intentionally denies all `/connect/*` and `/api/*` routes, even for forged or apparently valid credentials. It serves a public informational staging homepage and a health check only. This is not NEO Pass login, Chromebook pairing or device enrollment. Keep auto-deployment off and don't supply secrets.

Run `node --test deploy/noogle-render/server.test.mjs` locally for verification. If a protected authenticated preview becomes necessary, that requires a new architecture and authorization gate rather than reusing production signing keys.
