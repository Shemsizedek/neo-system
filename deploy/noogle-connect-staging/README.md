# NSEC-039 — Isolated read-only Cloud Run release

This is a deliberately separate pull request based on `main`, independent from authentication-development PR #909.

- Included: small static informational page, GET health, GET disabled-capabilities response, no functional authentication/registration/terminal endpoints, container build and smoke tests.
- Excluded: WebAuthn, NEO Pass verifier and secrets, device enrollment, Guardian APK changes, remote terminal operations, DNS and HTTPS load-balancer modifications.
- Cloud provider: **Google Cloud Run only**.
- CI tests automatically on PR. Deployment job only runs after merging to `main`, from an explicit manual `workflow_dispatch` with `DEPLOY_PRIVATE`, gated by `holytemples-production` environment.
- The service is deployed with `--no-allow-unauthenticated`; this is for private smoke testing, not a public website.
- No release or DNS operation is triggered by creating this pull request.

**Follow-up requirement:** verify service IAM, Cloud Run status URL with authorized credentials, routing, domain ownership and TLS before ever considering public preview. Keep enrollment and Chromebook terminal disabled.
