# NEO-FLIP-004 — Protected Buyer Registry and Permissioned Source Staging Boundary

**Operator:** Shelton Estate & Co. (legal payee and signatories not independently verified).
**Coordinator:** NIA-013 / NEO Deal Desk.
**Status:** implemented as isolated, ephemeral, *non-deployed* adapter; not live persistence.

## Delivered code
- `server/neo-flipper/staging-gate.mjs` exports `createGate4Staging`.
- `server/neo-flipper/staging-gate.test.mjs` tests deny-by-default authorization, private data rejection, consent, source rights, source freshness, preview redaction, opt-out and audit logging.
- Uses existing `server/neo-flipper/buyer-first.mjs` valuation, buy-box and Deal Desk preview functions. No separate global CRM create/merge occurs.

## Contract
The caller **must inject trusted server-side** `authorize`, `verifyBuyerAttestation`, `verifySourceGrant`, `verifyListingAttestation`, `verifySoldSales`, `verifyUnderwriting`, `sourceConnector.fetchListings`, and a clock. Missing adapters make construction fail closed.

### Caller authorization
`authorize({actor,scope})` must verify real authenticated NEOpass/server identity and privilege. Scopes:
- `buyer:write`: upsert pseudonymous buyers and suppress on opt-out;
- `buyer:read`: summarized consented buyers only;
- `listing:write`: fetch from an authorized source and validate every listing;
- `listing:read`: sourced lead previews;
- `deal:read`: cost- and buyer-screened matching previews;
- `audit:read`: minimal event timeline.

Do not expose this module directly over public HTTP. All identities, permissions, assertions and verification references are **untrusted input claims** until independently attested. The examples have only fake providers and synthetic data.

### Buyer data
A stored buyer is an opaque `B-...` identifier, allowed market/type lists, max all-in purchase price and minimal status/evidence references. **Reject direct names, emails, phones, bank accounts, proof-of-funds blobs, identity documents and contact tokens.** Put raw buyer PII in a separate encrypted vault with strict retention, audit and consent controls. The in-memory map is lost on restart and therefore **does not** meet durable registry, backup or recovery requirements. The interface has immediate opt-out suppression.

### Permissioned listing intake
Provider must have verified commercial-use rights; provider query is read-only and bounded. Import requires a recent independently attested active listing in the Texas pilot, >=120 reported days on market, and HTTPS source URL without query-token or fragment. No credentials are saved to the registry; do not place API keys in GitHub. Do not use ordinary HAR website pages as licensed commercial machine feeds. Feed responses and sales/valuation claims need authenticated provider verification.

### Deal Desk preview
Preview matches are advisory, read-only `{listingId,status,matches}` objects. They **never** create a binding quote, email, contract, signature, funds transfer or CRM row. Every preview has zero recognized revenue. `toBuyerFirstDealDeskRecord` produces a minimal Deal Desk-compatible `opportunity` shape, not an authenticated persistent integration.

## Operations and blockers
- Read-only Render workspace inventory checked 2026-11-20. Both NEO workspaces are accessible, but no verified dedicated NEO Flipper staging service or authorized source-feed configuration was identified. No Render service was created or altered.
- Real partner feed and comparables agreement; buyer opt-in KYC/funds attestor; NEOpass RBAC; encrypted database, KMS, backup/restore; protected Deal Desk staging API; e-sign and title/escrow receipts must be integrated and tested before production.
- If legal/business terms or partner feeds incur cost, obtain explicit approval before provisioning or purchasing.
- No external messages, live offers, signatures, payments or production changes in this gate.

## Verification
Run `node --test server/neo-flipper/staging-gate.test.mjs` plus all other `server/neo-flipper/*.test.mjs`.
The exact GitHub-committed module and its 13 test bodies passed in an isolated JS execution replay, but **Node CI on final branch remains separate verification**. No live credentials or buyers were used.

## Next gate
NEO-FLIP-005: authenticate buyer/source attestations and protected Deal Desk persistence in isolated staging, then test expiry, idempotency, redaction, consent withdrawal and provider outages. Keep binding actions and money movement outside the agent.
