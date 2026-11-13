# NEO Pass on Render

This runtime composes the persistent passkey account and identity issuer services without Google Cloud, Firestore or cloud SDK credentials. ChatGPT Sites remains the portal host.

Start: `node deploy/neopass-render/server.mjs` using Node 24.
Required configuration:
- `NEOPASS_ORIGIN`: the final exact HTTPS identity origin. Changing it breaks passkey origin binding.
- `NEOPASS_DATA_DIR=/var/data/neopass`: Render disk mounted at `/var/data` required; ephemeral storage is rejected.
- `NEOPASS_CLIENTS_JSON`: reviewed client registry with exact HTTPS callbacks. Empty registry permits no client login.
- `PORT`: supplied by Render.

Health route: `/healthz`. Enrollment is disabled in code until an authenticated first-owner migration and credential-enrollment path exists. Google/social sign-in is not included in this runtime. Do not direct production users here yet.

The runtime generates issuer signing and pairwise-identity secrets once into a permission-restricted file on the disk. It never logs them and fails on corruption instead of replacing them. Single-instance deployment only. Native SQLite backup/restore, tested off-service backups, ingress abuse protection and issuer-key recovery/rotation remain release requirements.

Deployment is not activated: the existing recovery service is unchanged. A dedicated service with durable storage must be provisioned before production accounts can be stored. No paid resources or database mutations were performed.
