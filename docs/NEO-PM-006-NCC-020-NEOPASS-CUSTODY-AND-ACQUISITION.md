# NEO-HOUSES-TX-014 / NCC-020 — Deed and Lien Acceptance, Corporate Counterparty & NEOpass Custody

**Development only:** PR #1406; no merge, no production service, county filing, property entry, ownership assumption, bank debit, debt collection, or Bitcoin broadcast.

## Transaction screen — 2502 and 2504 Algerian Way
- Current HCAD-listed entity on both 2026 parcel histories: **2502 Algerian Way LLC**. HCAD accounts **0772210030001** and **0772210020011**. HCAD's 2026 combined appraisal is **$3,591,507** across **29,788 land SF**; these are not accepted deal prices.
- Colliers sold listing confirms June 22, 2026 transaction date for 2502 Algerian, and lists former marketing contacts Jeff Peltier and John Parsley. Those are **historical listing contacts**, not verified current seller representatives. The HCAD listed owner effective date is June 24, 2026; official recorded deeds must resolve legal vesting/recording dates.
- Two separately executed June 2026 deeds, final recorded Gretna Courts Partial Replat No.3, company manager/member transfer authority, entity obligations, easements and secured-lien chain are **not authenticated** in this gate.
- Texas SOS states its LLC data does not maintain current LLC ownership/members; registrar/agent details are not equivalent to selling authority.
- The prior City of Houston PIA request `W346601-110926` remains acknowledged but no responsive building-condition documents were located in the connected inbox. No municipal abandonment/condemnation finding or adverse-possession period is established.
- No authentic parcel-specific secured lender, assignable obligation, foreclosure/judicial tax sale or asset manager mandate has been documented. A negative search result is not a lien-free certificate.
- Measurement issue to resolve: HCAD building area for 2502 is **5,408 SF** while Colliers marketed **6,651 SF**; no net rentable/gross area calculation or cash-flow assumption may rely on the latter until documented.

## NCC-020 development module
`server/neo-property-manager/neopass-custody-gate.mjs` is a **provider-neutral, fail-closed adapter**. This is not actual NEOpass passkey integration or a credential vault.

It requires injected server-side dependencies for:
1. `verifySession`: issuer-authenticated session, current passkey step-up, expiry and service-link verification. Browser claims are never a substitute.
2. `lookupGrant`: authoritative and revocable `custody-reviewer` role, subject matching and explicit `neo.property.custody.review` scope, independently of token claim roles.
3. `trustedReviewerKeys`: pinned reviewer Ed25519 public keys for verifying existing NCC-019 internal custody signatures.
4. `consumeNonce`: atomic, durable, pre-issued, one-time challenge registry with expiry to reject replay.
5. Max-age and expiration validation. Any unavailable backend is an authorization failure.

The only successful result is `CUSTODY_REVIEW_APPROVED_ONLY`. The response still has `titleAccepted=false`, `managementAuthority=false`, `propertyEntryAuthorized=false`, `bitcoinPublicationAuthorized=false`, `externalFilingAuthorized=false`.

`tests/neo-property-manager/neopass-custody-gate.test.mjs` contains eight synthetic security tests. Dedicated GitHub Actions run **42990224212** passed **41/41** tests across all source and authority suites at commit `50fac68458d26d6fadabc3149e6f7faaeee6b45e`. This is development readiness, not a verified user-authenticated custody approval.

## Integration release criteria
- Current active NEOpass passkey step-up; managed credential vault and private reviewer key lifecycle; legacy service migration and role enrollment, verified by server-side provider, not a client boolean.
- Scoped identity-to-service bridge, immutable audit, key revocation, stale-token refusal, real distributed challenge store and source-custody attestation linked to the private evidence vault.
- HCAD source receipts do **not** prove source issuer signature, corporate membership, county title, secured debt or statutory legal service.
- Real recorded deeds and lien/assignment chains obtained through official County Clerk source search, then independent title/legal review before any purchase, security instrument, mortgage servicing or occupancy operation.
- No automated deemed-consent or new possession clock from constructive notice, upkeep, posted signs or blockchain messages.

## References
- County Clerk search: https://www.cclerk.hctx.net/applications/websearch/RP_R.aspx
- Colliers property: https://www.colliers.com/en/properties/2502-algerian-way/usa-2502-algerian-way-houston-texas-77098-4102-usa/usa1145494
- Texas SOS management & ownership FAQ: https://www.sos.texas.gov/corp/managementinfofaqs.shtml
- City PlatTracker: https://plattracker.powerappsportals.us/
- HCAD: https://hcad.org/quicksearch/
- TREC property manager: https://www.trec.texas.gov/q-does-property-manager-have-be-licensed
