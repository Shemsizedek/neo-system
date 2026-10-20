# NMASK-035 — NEO Pass authenticated portfolio and Counterparty synchronization
This gate supplies an authorization and response-validation contract only. It is **not** a live OIDC integration, trusted Bitcoin node, Counterparty API connection, issuer verification, or production release.
The principal.source field is not cryptographically secure by itself: it MUST only be constructed in a trusted server process after JWT signature, issuer, audience, expiry, revocation, tenant and session validation. Never deserialize it directly from a browser request.
A trusted server-side reader must independently authenticate its Bitcoin/Counterparty sources and establish tip hash, currency divisibility, issuer verification and consistency. The returned providerAuthenticated flag must never be sourced from an untrusted client.
New bridge is read-only. No signing, sending or settlement endpoints. The protocol identity and UI remain on the dependent NMASK-034 and NMASK-033 review branches.
Focused tests: node --test src/neopay/neoMaskPortfolio.test.mjs src/neopay/neoMaskBridge.test.mjs apps/neo-counter/src/neomask/bridge.test.mjs.
Before merge: run full project tests/build, actual OIDC integration, durable session revocation, Counterparty and Bitcoin synchronization integration and security review.
