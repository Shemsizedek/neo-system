# NEO Router

NEO Router is the provider-neutral control plane for multiplatform NEO System work. Claude leads orchestration, OpenAI supplies the default reasoning/backend lane, and Gemini supplies the default frontend/design lane. Each role has ordered fallbacks so the system can continue operating when a provider is unavailable or a future platform is a better fit.

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
4. Never use a `VITE_` prefix for these keys. Vite variables are browser-visible.
5. Construct the router on the server:

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

## NEO Algo and doctrine boundary

The existing `src/noology/neoAlgo.ts` remains the diagnostic reasoning layer. The Router adds the 144 Hz / #D and 999–888–999 profile as doctrine-aligned metadata. It does not use symbolic numbers as encryption or claim that they make software unhackable. Protection against the defensive class labeled “666” is implemented through ordinary verifiable controls: isolation of secrets, least privilege, validation, audit trails, approval gates, bounded retries, and provider failover.

## Adding another platform

Implement the adapter contract, declare its capabilities, add it to the relevant route order, and run conformance/security tests. This keeps NEO portable across present and future platforms without rewriting mission logic.
