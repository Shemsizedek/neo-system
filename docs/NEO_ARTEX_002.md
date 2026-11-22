# NEO-ARTEX-002 — controlled installation and safe autopilot

Status: **adapter integrated on feature branch; ARTEX runtime not installed or deployed.**

## Current gate

ARTEX is an optional autonomous penetration-testing engine evaluated for the
NEO Hacker defensive control plane. NEO's canonical security governance in
\`governance/NEO_GUARDIAN_HACKER_SECURITY_DIRECTIVE.md\` applies.

- Source: https://github.com/BaaRai/ARTEX
- Evaluated release: \`v0.7.0\`
- Pinned upstream commit: \`22ae88afabf66e47e73644a0528d8b427c4c80b8\`
- Upstream license: AGPL-3.0; legal obligations require review before offering an
  integrated network service.
- Upstream runtime: Go + embedded Next.js UI + PostgreSQL, source-built Docker
  configuration.
- Upstream security: review latest advisory list and SECURITY.md before release.
  Never use the historically compromised \`tomicdd/artex\` Docker image.

## Integration implemented

\`server/neo-hacker/artexAdapter.mjs\` is a **pure, offline,
no-network event adapter**. It accepts sanitized synthetic ARTEX-shaped
candidate findings, validates exact loopback HTTP origins and severity,
and passes only hashes and controlled metadata to the existing
\`createGuardianSecurityPipeline()\` and incident ledger.

This adapter intentionally does **not**:
- Connect to or authenticate to a running ARTEX API.
- Trigger pentests or execute ARTEX-proposed commands.
- Export raw traffic, URLs with secret-bearing query parameters, LLM prompts,
  credentials, student/tribunal records or findings content.
- Determine that an ARTEX finding is a proven attack from one tool result.
- Authorize NEO Router actions.

Note: actual upstream ARTEX report JSON is not yet normalized into the adapter.
Build an explicit versioned parser after securing and inspecting a real sanitized
export from the pinned upstream release.

## Automated schedule

\`.github/workflows/neo-artex-autopilot.yml\` schedules **daily
offline security-integration tests** at 09:23 UTC, and runs on relevant PRs or
main updates. This is automated adapter validation, not autonomous scanning.
There is no AI API spend, no network target, and no privileged deployment.

## Gate 3: runtime promotion checklist

1. Verify tag/signatures, build ARTEX from exact source SHA, run dependency
   and container scanning, check advisories and licensing.
2. Provision a **disposable isolated lab**, with independent firewall denies
   and only a synthetic test application. Do not re-use NEO production Postgres.
3. Bind ARTEX UI/proxy only to loopback or a private admin network with
   authenticated access; keep task target gate enabled and scope allowlist set.
4. Explicitly configure fixed-cost token/turn budgets, approvals and quiet
   request limits. No blanket shell approval.
5. Verify an out-of-scope URL is blocked by **network policy** even when
   a model or ARTEX application attempts it.
6. Verify original ARTEX API schema against a pinned release, build a
   validated sanitizer and evidence-retention contract, and run a known-answer
   target test. Require independent proof before marking verified.
7. Connect an **approved, separate** runtime only after tests,
   hosting/cost review and human gate acceptance.
8. Maintain stop switch, logs, backups, key rotation and rollback instructions.

## Evidence and restrictions

No production changes, live scanning, wallet access, DNS mutations, logins,
payment operations, blockchain operations or spending are permitted by this
repository integration. The GitHub workflow cannot execute ARTEX or contact
external scanning targets.
