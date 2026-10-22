# CROWN-GEM-003 — Gemini / NEO Crown API Bridge

Status: staging gate; **not deployed or connected to a consumer Gemini Gem or Skill**.

The implementation package is produced separately as `crown-gem-003.zip` and must be reviewed/imported into `deploy/crown-gem-003/` before deployment. This gate deliberately does not mutate existing NEO Render services.

## Architecture

Gemini API application/agent → authenticated read-only bridge → approved public Bitcoin Esplora / Counterparty v2 upstreams / optional NEO Crown attestation provider.

A consumer Gemini Gem's instruction text cannot by itself attach or execute arbitrary network functions. Adapt the gateway to officially supported tool runtimes as they become available. All wallet signing, treasury access, issuance, broadcast, and financial account actions remain prohibited.

## Security release criteria

1. HTTPS ingress; service-to-service authentication; avoid secrets in Gem instructions.
2. Upstream exact hostname allowlist; redirect denial; public-IP egress restrictions; bounded responses and timeouts.
3. Verified upstream schemas, live read-only sample transactions and assets, and independent verification of claims.
4. Rate limiting, metadata-only logging, token rotation, staging isolation, and explicit deployment cost review.
5. Human-reviewed test results before promotion; document live URL only once actually deployed.

Current gap: complete cloud-egress enforcement, DNS rebinding protection and production identity provider before public release.

## Rollout

- Validate source package locally and security review.
- Import into this feature branch and run CI.
- Provision an isolated staging service only with approved pricing and secrets.
- Probe Bitcoin and Counterparty endpoints, then add a trusted Gemini developer application client.
- Confirm platform-provided Gems/Skills tool connectivity rather than assuming it.
