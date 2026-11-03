# NEO-OMARCHY-002 — Private Ollama Lab Bridge & Scoped Worker

**Date:** 2026-11-03  
**State:** Source implementation for review. Lab hardware and production activation remain unverified.

## Purpose

Advance Gate 001 into a narrowly scoped **local-only** proof of NEO Router's Ollama inference path on an operator-controlled Omarchy Linux device. Omarchy is a desktop environment, not a replacement for Render, GitHub Pages or production NEO APIs. No AI swarm, unbounded job execution, or autonomous financial authority is introduced.

**Dependencies:** Gate 001 draft PR #1326 / `feat/neo-omarchy-001`; source: `scripts/neo-omarchy-preflight.mjs`, `server/neo-router/ollama-provider.mjs`, `server/neo-router/router.mjs`. This PR is stacked on the Gate 001 branch and must be rebased/retargeted when Gate 001 merges.

## Delivered in source

- `server/neo-omarchy/lab-bridge.mjs`: an opt-in Node HTTP service bound **only to 127.0.0.1 on a random port**; fixed, declared NEO agent identity; 256-bit hex bearer-token shared-secret; authentication on both health and inference; no cloud-provider fallback.
- Only `POST /v1/infer` with `capability: "local-inference"`. Rejects unknown keys, system prompt overrides, action requests, tool invocations, unsolicited identities, and large bodies. One inference at a time; bounded output tokens; structured audit *metadata* (not prompts, tokens, secrets or model outputs).
- The lab reuses `createOllamaAdapter` and `createNeoRouter` from NEO Router; failures are closed and redacted. Requests cannot execute shell commands, administer the device, run brokerage activity, perform wallet signing or connect to other networks through this service.
- `scripts/neo-omarchy-lab-smoke.mjs`: operator-only localhost health/inference probe, **no default live test**.
- `server/neo-omarchy/lab-bridge.test.mjs`: mock-based integration/contract tests.
- `.github/workflows/neo-omarchy-002.yml`: CI tests, with no secrets or hardware deployment.

## Manual activation in a separately installed Omarchy lab

**Device preconditions:** A spare x86_64/aarch64 machine or isolated disposable VM manually installed with a verified, vendor-signed Omarchy ISO and reviewed backup/disk plan. Official documentation: https://omarchy.org/manual/getting-started/. Omarchy can repartition/wipe selected drives. Do not run an unattended disk installer from a remote agent. Omarchy's installation may require firmware security changes; seek device-owner approval before doing so. It does not install on an Android phone as an APK.

**Install operator-approved tools** through Omarchy's documented package options and confirm Node.js 24, Git and Ollama. Choose a model that fits GPU/RAM, has acceptable licensing, and is locally installed. Do not assume the test environment already has one.

From the repository checkout on the **Omarchy device**:

```bash
git fetch origin
git checkout feat/neo-omarchy-002
node scripts/neo-omarchy-preflight.mjs --json
node --test server/neo-omarchy/lab-bridge.test.mjs
```

Generate an ephemeral **local-only** secret (never put it in Git, shell history, ChatGPT, issue comments or screenshots):

```bash
export NEO_OMARCHY_LAB_ENABLED=1
export NEO_OMARCHY_LAB_TOKEN="$(openssl rand -hex 32)"
export NEO_OMARCHY_AGENT_ID=neo:agent:omarchy-lab-001
export OLLAMA_BASE_URL=http://127.0.0.1:11434
export OLLAMA_MODEL=your-reviewed-installed-model
node server/neo-omarchy/lab-bridge.mjs
```

It prints `127.0.0.1` and a random listening port. Use a **separate terminal in the same trusted user session**, with that same token and agent ID privately available, then set the discovered port:

```bash
export NEO_OMARCHY_LAB_URL=http://127.0.0.1:YOUR_DISCOVERED_PORT
node scripts/neo-omarchy-lab-smoke.mjs
```

A successful smoke proves a locally authenticated HTTP request reached the **NEO Router Ollama adapter**, and the configured model returned a nonempty response. It does **not** prove model quality, external remote connectivity, machine attestation, NEOpass login, or production readiness.

**Rollback:** stop the Node lab process, remove the three `NEO_OMARCHY_LAB_*` values from shell/session, revoke the token by restarting with a new one, and restore the lab snapshot if needed. No systemd unit, Docker container, remote listener, cron schedule, port-forward or automatic restart is created.

## Trust boundaries

1. **Host isolation:** no new production DNS, web endpoints, VM, VPS, Render deployment or Cloudflare integration.
2. **Local transport:** bind to `127.0.0.1` only; configured Ollama origin must resolve to explicit loopback address/localhost. Do not proxy this endpoint to a public network. Local malware or a compromised same-user process is still a threat; this is **not a production-grade authentication gateway**.
3. **Identity:** the fixed `NEO_OMARCHY_AGENT_ID` prevents substituting an arbitrary principal in the lab request. Possession of the shared secret is the only authenticator. **NEOpass passkey identity, device attestation and delegation mapping are not implemented.**
4. **Audit:** logs only mission ID, declared agent principal, route scope, outcome and timing; not durable, independently witnessed, signed or shipped to Crown Chain. Avoid making verified-custody claims.
5. **Approval boundary:** this cannot delegate authority to NEO Bank, NOMNI, NEO Pay, NEO Tokenworks or a Bitcoin wallet. All consequential actions remain separately approved according to `governance/NEO_ORCHESTRATION_IDENTITY_STANDARD.md`.
6. **Supply chain:** no upstream Omarchy or Ollama installer/model downloads in CI. Before lab install, verify current release, checksum/signature, model license and local storage security. Omarchy's upstream artifact distribution may depend on Cloudflare even though NEO infrastructure does not.

## Acceptance criteria

- The dedicated Gate 002 synthetic CI tests pass on GitHub.
- Obtain lab owner device approval, approved Omarchy install provenance, backup and host preflight result.
- Install an explicitly selected Ollama model only on the lab machine and run the authenticated manual smoke.
- Inspect missing log durability, authentication hardening and recovery before a remotely reachable service is permitted.
- Confirm that a local failure never falls back to an unapproved cloud model.

**Release decision:** Do not merge directly into production without reviewing both stacked PRs and their CI. Do not open the lab bridge to remote callers.

**Next gate — NEO-OMARCHY-003:** outbound-only authenticated worker enrollment via NEOpass-issued machine identity, non-secret job metadata, scoped task leases and Crown Chain-compatible audit evidence; deployment remains opt-in until tested.
