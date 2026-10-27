# NSEC-081 — Render staging (NO production credentials)

## Chromebook local terminal page update

The Device Hub now links to `/chromebook/`, a static browser client for the existing local Chromebook companion. `/chromebook` redirects to the trailing-slash URL and `/chromebook/terminal.mjs` serves its module. The page's CSP permits command requests only to `http://127.0.0.1:8766`; the homepage keeps its existing policy. A session token is held only in the browser page and sent directly to that loopback destination. The Render server has no command endpoint or command proxy, and all `/connect/*` and `/api/*` denials remain in place. Browser pairing never grants terminal access.

Use the canonical `https://connect.holytemples.org/chromebook/` origin on the Chromebook running the companion. Other origins are rejected by the existing companion. Deployment does not establish Chromebook Chrome local-network permission or Linux-loopback reachability: verify Connect produces `pwd` output and `[exit 0]` on the actual device.

The client also offers **Remote server (SSH)**. Those requests go only to the updated companion's `/ssh/command` on loopback; Render does not expose `/ssh/command`. OpenSSH uses existing Chromebook keys/configuration with strict host verification and no interactive password, agent forwarding, or port forwarding. Hostname/alias, optional Linux username and optional port are entered in the page; keys are never uploaded. Selecting SSH does not grant this chat access or turn the ChatGPT development workspace into an SSH host.

Root `render.yaml` tracks `main` and keeps automatic deployment off. After reviewing and merging the update, manually deploy the latest commit for the existing service in Render. Verify `/healthz`, the Device Hub link, `/chromebook/`, and its module, then test the Chromebook connection. SSH users must update and restart their Chromebook companion, then verify Connect and a command against their actual server. No DNS, NEO Pass, database, or Render secret changes are needed. See [the companion instructions](../../apps/neo-connect-chromebook/README.md).

Run the build command from `render.yaml` to validate the HTTP routes, browser client behavior, pairing, and companion authentication before deployment.

## Original staging scope

This temporary **public, read-only** Noogle Connect preview does not proxy to protected Cloud Run, read production databases, or use NEO Pass keys. Existing `noogle.holytemples.org` DNS, search and Google Cloud stay unchanged.

After merging, sign in to Render and create a Blueprint from the `Shemsizedek/neo-system` GitHub repository using root `render.yaml`. Review the **free** plan, no other services, and the deployment settings before approving. Render assigns an actual `*.onrender.com` URL at provisioning; do not assume any address before provisioning.

The service intentionally denies all `/connect/*` and `/api/*` routes, even for forged or apparently valid credentials. It serves a public informational staging homepage and a health check only. This is not NEO Pass login, Chromebook pairing or device enrollment. Keep auto-deployment off and don't supply secrets.

Run `node --test deploy/noogle-render/server.test.mjs` locally for verification. If a protected authenticated preview becomes necessary, that requires a new architecture and authorization gate rather than reusing production signing keys.
