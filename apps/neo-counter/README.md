# NEO Counter

NEO Counter is the standalone Bitcoin / Counterparty XCP point-of-sale and merchant-services application for the NEO Ecosystem.

## Mission

Provide merchants with a unified commerce layer for Bitcoin, Counterparty assets, supported fiat currencies, card-network integrations, QR payments, merchant treasury management, and programmable settlement.

## Deployment doctrine

NEO Counter follows a GitHub-primary architecture.

1. **GitHub repository — canonical source of truth.** `Shemsizedek/neo-system` owns application source, architecture, configuration templates, documentation, change history, CI/CD definitions, and release provenance.
2. **GitHub Actions — primary build and deployment control plane.** Changes are validated and assembled from the repository before publication.
3. **GitHub Pages — primary public frontend.** NEO Counter is built from `apps/neo-counter` and published with the NEO Ecosystem Pages artifact at `/neo-system/apps/neo-counter/`.
4. **Runtime services — replaceable execution layer.** Persistent APIs, merchant synchronization, databases, payment observation, and other server-side workloads must run on suitable compute because GitHub Pages is static hosting. Runtime services do not become the canonical source of truth.
5. **Vercel — backup/failover mirror only.** A Vercel deployment may be retained for resilience and testing, but Vercel status does not define the health of the primary NEO Counter deployment.
6. **Base44 — legacy/secondary application surface.** Base44 app id `6a7a25d9783a8c3c7be1b423` may remain available as a secondary surface or reference implementation; it is not the primary engineering or deployment authority.

### Primary deployment path

`GitHub source -> GitHub Actions -> GitHub Pages frontend -> GitHub-controlled runtime configuration -> replaceable runtime services`

Backup path:

`GitHub source -> Vercel mirror/failover`

## v0.1 scope

- Merchant onboarding shell
- Product catalog and cart
- Payment-intent lifecycle
- BTC / XCP / Counterparty asset abstractions
- QR checkout
- Transaction ledger
- FX quote interface
- Receipts
- Settlement preferences
- Test/mock payment rails

## Runtime boundary

GitHub Pages does not execute persistent server processes. The optional `VITE_NEO_COUNTER_SYNC_ENDPOINT` and other provider endpoints therefore point to external runtime services whose source, interface contracts, configuration templates, and deployment policy remain governed from this repository. NEO Counter remains local-first when no shared sync endpoint is configured.

## Safety boundary

v0.1 does not custody production private keys, originate regulated fiat transfers, issue live debit/credit cards, or process production cardholder data. Those capabilities require dedicated security, compliance, banking, card-issuing, and payment-processing integrations.

## Structure

- `docs/BUILD_SPECIFICATION.md` — product and engineering requirements
- `docs/ARCHITECTURE.md` — system boundaries and services
- `docs/PAYMENT_RAILS.md` — BTC/XCP/fiat/card rail model
- `docs/SECURITY_AND_COMPLIANCE.md` — security and regulated-service boundaries
- `src/domain.ts` — initial domain model
- `src/payment-core.ts` — payment-intent prototype
