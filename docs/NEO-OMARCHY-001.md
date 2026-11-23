# NEO-OMARCHY-001 — Optional Omarchy Linux Agent Host

**Date:** 2026-11-03  
**Status:** Gate 001 implementation proposed for review; no device installed, no service activated, no production deployment.

## Decision

Adopt [Omarchy](https://github.com/omacom/omarchy) as an **optional, operator-owned Linux desktop / lab compute node** for NEO development and local inference. Do **not** replace the NEO System website, Render deployments, existing API gateways, NEO Router identity boundaries or authentication with a Linux desktop operating system. Omarchy does not independently implement a trusted, unattended AI-agent swarm.

Verified upstream references:
- Project: https://github.com/omacom/omarchy (MIT license)
- Installation: https://omarchy.org/manual/getting-started/
- AI tooling / Ollama: https://omarchy.org/manual/ai/
- Security: https://omarchy.org/manual/security/
- Reviewed stable release at gate authoring: v4.0.6; revalidate the actual signed release, architecture and vendor checksums immediately before installation.

## Existing NEO integration points

- **NEO Router:** `server/neo-router/ollama-provider.mjs` already implements an opt-in native Ollama adapter. `server/neo-router/router.mjs` routes `local-inference` to Ollama without cloud fallback. This is a *source-code capability*, not evidence that an Ollama server is running.
- **NEO Oracle AI:** possible consumer of local models through the governed Router. No inference was run in this gate.
- **NEOsync / NEO Agent Runtime:** future scheduled or on-demand agents must use delegated identity, scoped operations, auditable outcomes and human approval for consequential actions, consistent with `governance/NEO_ORCHESTRATION_IDENTITY_STANDARD.md`.
- **NEO Terminal:** workstation UI and developer tools are possible. Omarchy never grants trade-execution, signing, treasury or wallet authority.
- **NEO Guardian:** future host posture collection is permitted only through an authenticated, read-only agent.
- **NEOpass:** potential authentication / host enrollment integration in later gates; never export or clone users' passkeys or credentials to Omarchy.

## Topology

```text
Operator-owned laptop / desktop / disposable VM
  Omarchy (Linux desktop, default agent privileges untrusted)
     ├── local Ollama (optional; 127.0.0.1 only)
     ├── NEO source checkout + Node.js 24 + Git
     └── proposed authenticated, outbound-only NEO worker (NOT deployed)
                 │
                 ▼
        NEO Router / Oracle AI (existing source integration)
                 │
        NEO identity / action policy
                 │
        NEOsync / Terminal / Guardian (later integrations)
```

Do not expose Ollama or OpenClaw gateways on public interfaces. Any remote worker needs private network transport, server-authenticated TLS, scoped machine identity, rate limits, task controls and audit logs. Keep the existing GitHub Pages/public NEO application and existing production hosts unchanged.

## Gate 001 contents

- `config/neo-omarchy-profile.json`: disabled-by-default integration inventory, component mapping and non-negotiable operating constraints.
- `scripts/neo-omarchy-preflight.mjs`: **read-only** Linux/Arch/Omarchy, Node.js, Git, optional Ollama/container-tool availability checks; rejects non-loopback local-model URLs. Does not install, run, download, open ports, provision credentials or change the host.
- `scripts/neo-omarchy-preflight.test.mjs`: pure contract tests using synthetic hosts.
- `.github/workflows/neo-omarchy-001.yml`: source checks and simulated tests; **no** install, SSH, privileged commands or production secrets.

For an existing, separately installed Omarchy test machine:

```bash
git clone https://github.com/Shemsizedek/neo-system.git
cd neo-system
git checkout feat/neo-omarchy-001
node --test scripts/neo-omarchy-preflight.test.mjs
node scripts/neo-omarchy-preflight.mjs --json
```

An exit code of 0 means only that mandatory **static** host checks passed, not that a live model, remote authentication, or production connectivity has been validated. Ollama can be added later using Omarchy's **Install > AI** menu following the official instructions and the model's license; no model is fetched by this gate. Server-side Router configuration already uses `OLLAMA_BASE_URL` and `OLLAMA_MODEL` (see `docs/NEO-OSS-001.md`).

## Controls and constraints

1. **No silent disk installation.** The official Omarchy full-disk installer can erase an existing disk. Stage it only on an expressly selected machine or disposable VM, after backup, vendor signature and SHA-256 verification, and owner approval. Omarchy's installation instructions currently require Secure Boot/TPM changes, which must be treated as a device-security review, not an unattended prerequisite.
2. **No autonomous permissions.** Do not enable auto-approval, passwordless sudo, shell execution, browser session sharing, credential access, payment/trade actions, or permanent OpenClaw/Hermes gateways for NEO agents by default. All consequential actions require separate explicit authorization under the NEO identity standard.
3. **Private inference.** Ollama binds to loopback for the initial local pilot. Only a separately reviewed private authenticated network path may connect remote services to it. Do not route sensitive materials to unapproved models.
4. **Upstream dependency transparency.** Omarchy's official security manual states that its upstream ISO/package/mirror delivery uses **Cloudflare**. This gate adds **no Cloudflare service to NEO**, but sourcing Omarchy may still depend on upstream Cloudflare distribution. If zero upstream Cloudflare dependency is mandatory, evaluate a plain Arch Linux worker instead of claiming Omarchy is Cloudflare-independent.
5. **Hardware.** Omarchy is a Linux desktop environment, not an Android APK, a container replacement or a hosted website. Android can remain a browser-based client. Local-model GPU/RAM needs depend on the model.
6. **License and patch review.** Omarchy itself advertises an MIT license; individual bundled apps, models, extensions and their updates require separate review. Pin a verified upstream release and review changes before promoting lab workers.

## Acceptance criteria / exit

- Branch and draft pull request exist; profile default-disabled and preflight tests pass.
- Identify a spare test machine/VM, its CPU architecture and the install method; capture verified release provenance and backup status.
- Run preflight on **actual** Omarchy hardware and record sanitized output.
- Test a local Ollama inference request using an approved model, then authenticated NEO Router delivery and an auditable read-only NEO agent task.
- Independently verify resource isolation, least privilege, restart/rollback, updates, logs and failure containment.

**Gate 001 can be considered source-ready after checks. Live-host readiness and production activation are explicitly not achieved.**

**Next gate — NEO-OMARCHY-002:** isolated Omarchy lab installation, verified Ollama/NEO Router private connectivity, scoped worker identity, audit and rollback tests; promote only after evidence review.
