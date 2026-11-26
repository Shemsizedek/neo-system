# NEO-ARTEX-002 — controlled installation and safe autopilot

Status: **adapter and local runtime installation manifest integrated on feature branch; ARTEX runtime not installed, running, or deployed.**

## Current gate

ARTEX is an optional autonomous penetration-testing engine evaluated for the
NEO Hacker defensive control plane. NEO's canonical security governance in
`governance/NEO_GUARDIAN_HACKER_SECURITY_DIRECTIVE.md` applies.

- Source: https://github.com/BaaRai/ARTEX
- Evaluated release: `v0.7.0`
- Pinned upstream commit: `22ae88afabf66e47e73644a0528d8b427c4c80b8`
- Upstream license: AGPL-3.0; legal obligations require review before offering an
  integrated network service.
- Upstream runtime: Go + embedded Next.js UI + PostgreSQL, source-built Docker
  configuration.
- Upstream security: review latest advisory list and SECURITY.md before release.
  Never use the historically compromised `tomicdd/artex` Docker image.

## Integration implemented

`server/neo-hacker/artexAdapter.mjs` is a **pure, offline,
no-network event adapter**. It accepts sanitized synthetic ARTEX-shaped
candidate findings, validates exact loopback HTTP origins and severity,
and passes only hashes and controlled metadata to the existing
`createGuardianSecurityPipeline()` and incident ledger.

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

## Local isolated runtime manifest (Gate 3)

The first source-pinned local-only ARTEX lab is staged in:
- `deploy/neo-artex-lab/compose.yaml` (ARTEX + PostgreSQL + synthetic local fixture).
- `deploy/neo-artex-lab/fixtures/index.html` (non-production target).
- `scripts/neo-artex-lab.sh` (prepare/start/status/stop/check controls).

The installer verifies the 40-character upstream commit and the v0.7.0 tag target, requires a clean checkout,
generates lab-only database credentials, and builds its own container image.
The UI binds to `127.0.0.1:8787`; the recording proxy is never published.
The Compose application uses `internal: true` networking without an external
network gateway. The target is available **inside the Docker network** as
`http://neo-artex-target:8080`, **not** as `127.0.0.1:8080` from the
ARTEX container. Initial NEO evidence ingestion still only accepts a synthetic
loopback report; it does not consume real ARTEX exports yet.

Manual commands on an authorized Docker host, after operator review:

```bash
bash scripts/neo-artex-lab.sh prepare
NEO_ARTEX_LAB_ENABLE=YES bash scripts/neo-artex-lab.sh start
bash scripts/neo-artex-lab.sh status
bash scripts/neo-artex-lab.sh stop
```

The updated startup path now executes `scripts/neo-artex-lab-smoke.sh` and
stops the disposable lab if basic isolation and readiness checks do not pass.
The smoke checker requires loopback-only UI publication, an unpublished proxy,
the internal-only Docker network, running containers, a healthy disposable
PostgreSQL service, and the known-answer fixture HTTP page. The smoke checker
does **not** perform vulnerability scans, validate firewall enforcement at the
host layer, or confirm ARTEX's own target gate is enabled. It is not a
production readiness certificate.

**No lab was started by this change.** Local Docker availability, upstream source
clone/build, network-deny checks, Postgres readiness and ARTEX application
health require a real Docker host. GitHub's scheduled checks validate NEO's
adapter and launcher, not the scanner runtime.

## Automated schedule

`.github/workflows/neo-artex-autopilot.yml` schedules **daily
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

## Gate 4 — 2026-11-21 execution evidence

- GitHub Actions for prior PR head `1d7a1558e792a5b9edce62470c1bf4a20d546d8d`:
  `NEO ARTEX lab gate (safe autopilot)` = success;
  `NEO Hacker` = success.
- Authorized workstation discovery: Desktop Commander `penguin` offline;
  SentinelX `crown-node-001` offline. No remote Docker installation was
  attempted, and no reachable authorized Docker host is presently confirmed.
- This gate extended the local launcher to fail closed after smoke validation
  and added source-release-tag verification and a read-only smoke script.
- New PR head and associated CI must be checked separately. Older passing CI
  results must not be attributed to newly committed files.
- No live ARTEX jobs, no model keys, no live NEO targets, no spending,
  no service deployments and no production modifications.

## Release-blocking checklist

- [ ] Latest CI for this gate is green (including shell syntax).
- [ ] Docker host connected and explicitly designated for isolated security lab.
- [ ] Pin upstream release provenance, dependency review, source-only build.
- [ ] Docker runtime starts with only internal network; metadata and default
      network egress blocked independently and tested.
- [ ] Lab UI authentication/setup confirmed and not internet-exposed.
- [ ] ARTEX per-task target/scope gates and human approvals enabled and tested.
- [ ] A real upstream report export schema sanitized and mapped to NEO evidence.
- [ ] Toy-only authorized security test completed with captured proof and
      independent retest.
- [ ] Shutdown, backup and cleanup procedures demonstrated.

**Release decision: NO-GO** for autonomous scanning or production access.
