# Project 144 — school authentication configuration gate

## Verified evidence

- WordPress DNS zone: `school.holytemples.org` CNAME targets `neo-platform-api-recovery.onrender.com`. This is configured-zone evidence; global propagation was not independently tested in this gate.
- Render: `neo-platform-api-recovery`, service `srv-db8pe7nf3r2c73eum130`, in `NEO workspace` (`tea-db8bbpij9qps73cb7gb0`), starts `node server/neo-platform-api/server.mjs` on free compute. It was not found in the newer NEO SYSTEM workspace. No migration was attempted.
- Latest listed deployment: `dep-dbo12k29lscs73ch77lg`, provider status `live`, source `1ab53201bdef4fe96b68e9774e8b2531b4eb7c41`. Provider deployment status does not verify authentication.
- Live board runtime probe: `https://school.holytemples.org/` returned HTTP 200 at 2026-11-08 00:43:57 America/Chicago (CST), with the Templist Portal title and setup-pending indicator. Login and member operations were not tested.
- Earlier live public-page inspection identified the exact notice: “Google Sign-In is awaiting administrator configuration.”
- Source files fetched from main match the deployed commit's blob SHAs for server.mjs, giss-production.mjs and neopass-google-auth.mjs.

## Source diagnosis

The production bootstrap in `server/neo-platform-api/server.mjs` requires all three groups to be truthy:

1. `GOOGLE_CLOUD_PROJECT` or `GCP_PROJECT_ID`;
2. `NEO_PASS_JWT_SECRET`;
3. `GOOGLE_OAUTH_CLIENT_ID`.

If any group is absent/empty, this entrypoint calls `startNeoPlatformApi()` rather than the production constructor. That default runtime renders the public portal without an auth service. The Google notice is selected when `authService?.clientId` is absent. A username/password form is still rendered, but the POST /login handler redirects to a failed-login page when no auth service exists. This is source behavior, not an attempted login.

`giss-production.mjs` constructs a Firestore registry and Google ID-token verifier. The authentication factory additionally returns null without a client ID, signing secret, registry or verifier. Supplying a client ID alone is therefore not a verified repair; valid signing configuration, Google audience/origin configuration and actual registry access must also be established.

The exact missing setting remains UNKNOWN: no environment-value listing, secret reads, secret generation, credential rotation, account creation or identity-policy changes were performed. The current UI is consistent with the fallback startup, but the production process environment has not been inspected or attested directly.

## Safe diagnostic

`scripts/check-giss-startup.mjs` mirrors only the prerequisite presence condition. Run it without arguments in the protected service environment using reviewed source:

```
node scripts/check-giss-startup.mjs
```

It emits missing requirement names and an expected bootstrap mode. It never prints environment values, accepts credentials on the command line, writes files, contacts Google/Firestore or changes startup. Exit 2 means missing inputs or invalid invocation; exit 0 means the prerequisites are present, not that they are valid or that login works. Do not post secret values or full environment dumps in chat, issues or logs. This diagnostic does not run itself on the hosted service.

Free Render compute has no interactive shell. Do not upgrade compute, trigger a deploy, alter the start command, or add a public diagnostic endpoint simply to run it. An authorized administrator can check presence in the protected settings UI or use an already-approved private execution path; retain only the missing-name report.

## Ordered remediation and acceptance

1. Confirm prerequisite presence on the exact school service. Preserve existing signing identity; do not replace an existing secret to satisfy a flag.
2. Have the authorized operator provision the verified Google client/project and signing configuration through the protected provider environment. Verify Google origin/audience for the school domain; never guess a client ID or reuse another application's credentials.
3. Verify the existing registry and access path before enabling production bootstrap. The current adapter uses Firestore; a move to Neon or another decentralized provider requires a reviewed compatible registry adapter and migration plan. Do not silently substitute a database or introduce a new provider dependency.
4. Validate in an isolated staging environment, then deploy only through the authorized repository/release process. Retain rollback to the previous runtime/configuration without exposing signing material.
5. Verify the Google button renders, invalid/untrusted identities fail, session creation/logout work for an explicitly authorized test account, and member access remains governed by existing permissions. Separately validate password login and school learning flows.
6. Preserve the distinction between public-page availability, authentication configuration, authenticated access and full school health in the operations register. NEOpass/Prime domain TLS incidents are separate; do not repoint DNS as a shortcut.

Do not probe `/health/school` or `/health/crm` as read-only diagnostics without reviewing their behavior: the inspected GET handlers call `ensureSeed` and can write data. This gate used the root page only.

## Validation and gate outcome

Five dependency-free tests pass, covering all sixteen flag combinations, strict boolean input, suppression of supplied synthetic values, missing requirements and argument rejection. Test environments contain synthetic values only. No real production configuration was read and no authenticated session was created.

VERIFY: source/hosting/DNS mapping established. BUILD/TEST: diagnostic prepared and tested. CONNECT/DEPLOY: blocked on verified protected configuration and registry readiness. The school public page is reachable; authentication remains unverified. No DNS, runtime, access, financial or production changes occurred.
