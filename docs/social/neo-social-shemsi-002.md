# NEO-SOCIAL-SHEMSI-002 — Production UI + AI Gateway Adapter

This gate adds the first production UI surface for Shemsi Comment Assistant and connects draft generation to the existing NEO AI Gateway.

## Route

- `#/shemsi-comments`
- `#/comment-assistant`
- `#/neo-social/shemsi`

## Browser flow

`manual comment intake → NEO AI Gateway → editable draft → explicit approval`

The interface intentionally stops before publication. Platform write adapters, account resolution, durable draft storage, and publication receipts remain later gates.

## AI gateway

The browser client sends a non-action mission to `/api/ai/execute` with:

- capability: `writing`
- actions: `[]`
- approved: `false`
- autoKnowledge: `false`

The gateway base may be configured with `VITE_NEO_AI_GATEWAY_URL`. If omitted, the client uses the same origin.

## Design migration

The supplied Meta artifact informed the black/amber visual direction. This implementation is native NEO React/CSS and has no dependency on Meta-hosted fonts, runtime bundles, or artifact infrastructure.

## Next gate

**NEO-SOCIAL-SHEMSI-003** — durable comment inbox/draft queue, authorized account adapters, and normalized reply receipts.
