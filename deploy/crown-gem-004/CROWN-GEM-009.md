# CROWN-GEM-009 — Live verification release gate

This change adds a **manual**, least-privilege GitHub Actions workflow to verify the authenticated bridge. The workflow does not schedule jobs, deploy services, or expose secrets in logs.

## Required repository configuration

GitHub Environment: `crown-staging` with restricted reviewers and only the staging branch authorized where possible.

- Environment variable `CROWN_BRIDGE_URL`: verified HTTPS Render URL.
- Environment secret `CROWN_BRIDGE_TOKEN`: same private token as the Render staging app; never put it in Gem instructions, source files or plaintext chat.
- Dispatch inputs: known Bitcoin mainnet transaction ID (64 hexadecimal characters); public Counterparty asset `XCP`.

Run **Crown Bridge Live Verification** from GitHub Actions and inspect the results. All checks must pass, including authenticated health, returned Bitcoin transaction ID, and Counterparty HTTP 200 before recording the integration as live.

## Blockers

1. The code currently accepts upstream HTTPS on port 443 only. The official Counterparty public API documentation lists `https://api.counterparty.io:4000/v2/`. **Do not** allow arbitrary custom ports merely to make this work; review an approved trusted proxy or explicitly pin and secure the required host/port, with egress restrictions.
2. The smoke verifier's configured sample asset check currently requires only HTTP 200, not an asset identity assertion. Improve schema and network assertions prior to certification.
3. GitHub Actions cannot attest to a Gemini developer function call. A separate protected developer runtime and API credential are required.
4. The existing Python gateway checks DNS before opening a new URL but does not pin the resolved address. DNS rebinding and redirect/error hardening remain production blockers.
5. Review and rotate staging bearer credentials and add denial-of-service protections before any broad access.

**Status:** verification workflow implemented, but credentials, run, and Gemini invocation have not been verified.
