# Project 144 — Coinbase financial-provider isolation policy

**Binding architectural decision:** NEO is Bitcoin-first. Coinbase is an untrusted *external vendor*, not part of NEO Core and never a wallet, identity, AI-agent, or network authority.

## Permitted business use cases (subject to provider eligibility and legal review)
- NEO Bank: institutional fiat onboarding, approved bank rails, account reporting, native BTC settlement.
- NEO Pay: user-directed fiat-to-native-BTC onramp / native-BTC-to-fiat offramp if the actual product, geography and account qualify.
- NEO FX: quoted fiat/BTC conversions and reconciled institutional settlement with explicit risk controls.

## Absolute restrictions
- No Ethereum, EVM, Base, ERC-20, stablecoin rails, wrapped BTC (including cbBTC/wBTC), or Base Builder Code/8021 attribution.
- Do not connect Coinbase MCP directly to general NEO Oracle, NEO Core, NEOpass, NeoMask, BVM/NVM, database, admin panel or broad ChatGPT agent.
- Do not disclose NEO private keys, passkeys, seeds, signing powers, internal customer profiles, general ledger access or unrestricted transaction rights.
- Dedicated provider-specific service identity, minimum scopes, isolated secrets, egress allowlisting, request/response schema allowlists, rate limits, audit events, idempotency, reconciliation and kill switch. No provider callback may execute privileged internal actions.
- Coinbase Prime documents an aggregated BTC trading balance that may include cbBTC on Ethereum/Base. **Never use ticker BTC or a consolidated balance as proof of native Bitcoin network provenance.** Network metadata is mandatory per quote, instruction and payout; ambiguous records are rejected.

## Implementation gates
1. Confirm available Coinbase Business / Prime / Onramp / Offramp APIs and native BTC network support for NEO's account, jurisdiction, entity and use case.
2. Establish a dedicated NEO financial gateway in staging, no access path back into Core or secrets. Separate portfolio/API keys with readonly permissions first, never broad MCP trading rights.
3. Build narrow provider DTOs for read-only quotations, status, reconciliation and Bitcoin deposit instructions. Implement a canonical asset/network mapping and reject unknown responses.
4. Add compliance review for AML/KYC, MSB/money transmitter applicability, sanctions, custody/partner responsibilities, geography and customer disclosures before any customer-facing financial product.
5. Before *any* live financial operation: written approval, transaction limits, human confirmation, two-person institutional approvals when applicable, native BTC withdrawal-address allowlists, simulation, failure/rollback and monitoring.

## This pull request
- Pure validation library `integrations/coinbase/boundary.mjs`
- No networking, external permissions, credential access, signing, financial movement, production wiring or feature flag enabling.
- `node --test integrations/coinbase/boundary.test.mjs` for policy regression tests.
- The old ERC-8021 draft PR #1265 was closed unmerged and must not be reopened or copied into product paths.

Official provider references:
- https://docs.cdp.coinbase.com/api-reference/v2/business-onboarding
- https://docs.cdp.coinbase.com/prime/concepts/transactions/multinetwork
- https://docs.cdp.coinbase.com/onramp/additional-resources/sandbox-testing
