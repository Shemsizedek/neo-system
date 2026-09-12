# Google AI Studio ↔ NEO Router Bridge

This bridge makes Google AI Studio a governed development surface for the existing NEO Router v2 control plane. It does not create a second AI backend.

## Canonical flow

Google AI Studio / GitHub Connect → `feat/ai-studio-*` branch → NEO Router v2 → existing provider adapters → validation → pull request → approved merge → existing production deployment.

## Existing provider mesh

NEO Router already supports provider-neutral mission routing. The current server-side mesh includes Anthropic, OpenAI, Gemini, xAI, and Cloudflare Workers AI lanes. Provider credentials remain server-only and are never committed or exposed to browser code.

The bridge manifest is `integrations/ai-studio/neo-router-bridge.json`.

## AI Studio role

AI Studio is authorized to:

- inspect repository code available through GitHub Connect;
- propose UI, frontend, design-system, documentation, test, and provider-neutral integration changes;
- work only on `feat/ai-studio-*` branches;
- reuse `server/neo-router` and existing provider adapters;
- submit changes through pull requests for validation and approval.

AI Studio is not authorized to:

- write directly to `main`;
- read, print, log, or commit secret values;
- alter NEOpass signing semantics or production IAM without a separately reviewed infrastructure gate;
- handle wallet private keys, wallet signing, custody, or automatic settlement;
- change CES ledger authority, NOMNI monetary policy, or Bitcoin/Counterparty settlement semantics;
- create a parallel AI backend when NEO Router can satisfy the capability.

## Provider routing

The bridge preserves the router's provider-neutral capability model:

- `orchestration`: Anthropic → OpenAI → Gemini
- `reasoning`: OpenAI → Anthropic → Gemini
- `frontend`: Gemini → OpenAI → Anthropic
- `edge`: Cloudflare Workers AI → Gemini → OpenAI

These orders are policy defaults, not hard-coded vendor dependencies. Existing runtime configuration remains authoritative.

## Secrets

All provider credentials belong in server/deployment secret stores. Never prefix provider secrets with `VITE_`. Browser-visible environment variables must not contain credentials.

The bridge references environment variable names only; it contains no credential values.

## Validation gate

Every AI Studio change must satisfy the repository's existing validation relevant to the touched code. Runtime/provider changes must include or update tests for the NEO Router/provider contract. Deployment remains controlled by the existing GitHub Actions and production approval path.

## First production use

The first approved AI Studio workload is the NEO Temple executive-dashboard visual enhancement. AI Studio should reuse existing NEO Temple components and API surfaces while treating NEO Router as the canonical cross-provider AI control plane.
