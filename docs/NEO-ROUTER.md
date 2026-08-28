# NEO Router

NEO Router is the provider-neutral control plane for multiplatform NEO System work. Claude leads orchestration, OpenAI supplies the default reasoning/backend lane, and Gemini supplies the default frontend/design lane. Each role has ordered fallbacks so the system can continue operating when a provider is unavailable or a future platform is a better fit.

Router v2 adds Cloudflare Workers AI as the primary edge, resilience, and IoT lane. Provider model IDs and timeouts are runtime-configurable, missions can prefer or exclude providers, and the health snapshot reports readiness without exposing credentials.

## Runtime contract

Every provider adapter exposes:

```js
{
  id: 'provider-id',
  configured: true,
  invoke: async ({ system, prompt, maxTokens }) => ({ provider, model, text, raw })
}
```

The mission remains provider-neutral:

```js
{
  missionId: 'NEO-MISSION-001',
  objective: 'Design the next NEO dashboard',
  capability: 'frontend',
  actions: [],
  maxTokens: 2048
}
```

## Connect Claude and the other providers

1. Create an Anthropic API key in the Anthropic Console.
2. Add `ANTHROPIC_API_KEY` to the server or deployment secret store.
3. Optionally add `OPENAI_API_KEY` and `GEMINI_API_KEY` for the other primary lanes and fallbacks.
4. Optionally add `CLOUDFLARE_ACCOUNT_ID` and a Workers AI-scoped `CLOUDFLARE_API_TOKEN` for the edge lane.
5. Never use a `VITE_` prefix for these keys. Vite variables are browser-visible.
6. Construct the router on the server:

```js
import { createNeoRouter, providersFromEnv } from './server/neo-router/index.mjs'

const router = createNeoRouter({ providers: providersFromEnv() })
const result = await router.execute({
  missionId: 'NEO-MISSION-001',
  objective: 'Coordinate a review of the NEO dashboard architecture.',
  capability: 'orchestration',
})
```

Having a Claude chat subscription does not automatically provide Anthropic API access; API billing and credentials are configured separately. The same separation generally applies to consumer subscriptions and API access for other providers.

Model defaults are convenience values, not permanent contracts. Production deployments should set `ANTHROPIC_MODEL`, `OPENAI_MODEL`, `GEMINI_MODEL`, and `CLOUDFLARE_WORKERS_AI_MODEL` explicitly and review vendor deprecation notices before upgrades.

## NEO Algo and doctrine boundary

The existing `src/noology/neoAlgo.ts` remains the diagnostic reasoning layer. The Router adds the 144 Hz / #D tesseract as a foundational reasoning and rationale model with two recurring perspectives:

- Human ascent: `777 → 888 → 999 → restart at 777`
- Angelic descent: `999 → 888 → 777 → restart at 999`

Every routed mission carries these cycles as doctrine metadata and applies their paired-review rationale to security, practicality, logic, principles, morale, and ethics. This makes the tesseract portable across NEOsync, NEO Algo, the Router, and future platforms without binding it to one AI vendor.

Etheric potential and the role of crystals and metals in technological hardware are retained as NEO doctrine and research context. A claim becomes an operational hardware control only when it has a measurable mechanism, test procedure, and reproducible evidence. The Router does not use symbolic numbers as encryption or claim that they make software unhackable. Protection against the defensive class labeled “666” is implemented through ordinary verifiable controls: isolation of secrets, least privilege, validation, audit trails, approval gates, bounded retries, and provider failover.

## Adding another platform

Implement the adapter contract, declare its capabilities, add it to the relevant route order, and run conformance/security tests. This keeps NEO portable across present and future platforms without rewriting mission logic.

## Psitronic and emerging-interface readiness

`NEO-PSITRONIC-READINESS-001` reserves a vendor-neutral integration boundary for future interfaces across applications, software, the web, IoT, media, sensors, devices, wearables, robotics, and assistive systems. Integrations use authenticated event envelopes and sandboxed capability adapters so new technology can join without receiving blanket system authority.

Any device input must be schema-validated and minimized. Any physical or consequential actuation requires explicit informed consent, signed device identity, least privilege, replay protection, a local kill switch, tamper-evident auditing, and human approval. A psitronic claim stays classified as experimental and unverified until a measurable mechanism and reproducible test demonstrate otherwise. This preserves openness to future technology while keeping the security model grounded and auditable.
