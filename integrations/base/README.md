# Project 144: Base ERC-8021 / Coinbase agent integration (staging only)

## Status

- Base Builder Code: **unverified**. The string `008021802180` supplied as a possible code resembles part of an ERC-8021 schema/marker and must **not** be assumed to be a registered NEO code.
- This module contains **no wallet, private key, signing, network request, transaction submission, or production integration**.
- NEO remains Bitcoin-first. Base is an optional chain-specific adapter, never an NEOpass authentication or Bitcoin/Counterparty dependency.

## Builder Code registration

For apps, visit Base Dashboard > Settings > Project Settings > Builder Code. Confirm the *raw Builder Code*, its registered owner, payout address, and app metadata. The dashboard may also supply a full **Encoded String** attribution suffix; do not confuse that hex with the raw builder code.

For AI agents, Base documents registration via `POST https://api.base.dev/v1/agents/builder-codes` with the **agent's public EVM wallet address**. Only register a wallet authorized for NEO; never submit secrets or private keys.

## Integration

```js
import { baseBuilderCodeSuffix, appendBaseBuilderAttribution } from './builder-code.mjs';

// Read the actual verified raw code from your deployment configuration.
const code = process.env.NEO_BASE_BUILDER_CODE;
const data = appendBaseBuilderAttribution('0xdeadbeef', {
  code,
  chainId: 84532, // Base Sepolia before any mainnet use
  enabled: process.env.NEO_BASE_ATTRIBUTION_ENABLED === 'true',
});

// For a compatible ERC-5792 wallet, use { capabilities: { dataSuffix: {
//   value: baseBuilderCodeSuffix(code), optional: true } } } instead of also
// manually appending. Never apply both pathways to one transaction.
```

Only add to transaction paths after a wallet/contract compatibility review: certain contracts can reject extra calldata. Verify with an actual **testnet** transaction and decode the suffix before any production switch. This module does not automatically activate anywhere.

## Coinbase MCP boundary

Coinbase's remote OAuth MCP endpoint is `https://agents.coinbase.com/mcp`. It is **account/portfolio access**, distinct from Base attribution and not an automatic connection through this repository. Add as a custom ChatGPT plugin on web if permitted by workspace policy; authorize a **dedicated restricted portfolio** and verify scopes. Never commit tokens, expose seed phrases, trade without a specific authorized action, or treat MCP connection as authorization for unattended spending. Prefer read-only access until safeguards and audit logs are reviewed.

## Verification

```sh
node --test integrations/base/builder-code.test.mjs
```

Sources:
- https://docs.base.org/specifications/builder-codes/overview
- https://docs.base.org/specifications/builder-codes/for-agent-developers
- https://docs.base.org/specifications/builder-codes/for-app-developers
- https://eip.tools/eip/8021
- https://docs.cdp.coinbase.com/ai-agents/coinbase-for-agents/coinbase-mcp
