# NEO Realty — ORIGIN

NEO Realty is the NEO System consumer real-estate marketplace: a Zillow-style discovery and transaction surface for physical property, with optional Bitcoin / Counterparty integration.

## Product boundary

NEO Realty separates three concepts that must never be conflated:

1. **Real-property ownership/title** — governed by the applicable deed, title records, contracts, and law.
2. **Occupancy/access rights** — temporary possession or access, including NEO Pads bookings.
3. **Token/contract rights** — only the rights expressly defined by the relevant instrument. Holding a Counterparty asset does not by itself establish deed ownership.

## Consumer surfaces

- Home / universal property search
- Map search
- Property detail
- List / manage property
- Buy / sell / rent workflows
- NEO Finance comparison surface
- Investor / tokenization disclosure surface
- NEO Pads availability for eligible units

## NEO integration graph

```text
NEO Realty
  -> Property Registry
  -> NEOworks entitlement/orchestration layer
  -> HOMESHARES integration (when explicitly configured)
  -> NEO Pads occupancy marketplace
  -> NEOpass identity/access verification
  -> NEO Counter checkout/settlement orchestration
  -> Bitcoin / Counterparty read and settlement adapters
  -> NEO Market for eligible instruments
  -> Treasury / accounting / audit surfaces
```

## Property model

A property record should support conventional real-estate data first: address, geography, property type, beds/baths, area, acreage, photos, listing status, asking price, rent, NOI, cap rate, occupancy, disclosures, documents, and financing terms.

Blockchain fields are additive and optional: settlement assets, Counterparty asset references, transaction references, wallet/payment destinations, and verification state.

## Economic model

The application may display multiple economic layers without treating them as equivalent:

- physical property and its legal title;
- productive cash flow from rent/occupancy;
- temporary occupancy through NEO Pads;
- defined tokenized contractual interests where lawfully offered;
- BTC / Counterparty settlement infrastructure;
- NOMNI / World Currency / other NEO denominations when explicitly configured and accurately labeled.

Yield or economic performance must be attributed to the productive property/business activity, not represented as intrinsic Bitcoin yield.

## ORIGIN provenance

The historical Crypto-Homes / Smart Realty materials supplied by the project founder are treated as ORIGIN design references. NEO Realty modernizes the concept rather than reproducing the historical artwork or UI.

The supplied World Currency white paper describes NOMNI as using the Bitcoin blockchain and identifies Counterparty as a platform for peer-to-peer financial applications on Bitcoin. It also contains a historical Smart Realty / Crypto-Homes diagram. These statements are retained as project-source provenance, not independent legal or regulatory verification.

## Safety / production boundary

NEO Realty must not:

- claim that a token automatically conveys real-property title;
- execute wallet signing or custody private keys;
- enable payouts merely because a listing exists;
- publish unverified ownership/title claims as verified facts;
- characterize an instrument as a security, non-security, deed, mortgage, timeshare, or other regulated interest without the governing instrument and applicable review;
- represent sandbox integrations as live production connectivity.

All money-moving adapters remain separately gated and auditable.

## Milestone NEO-REALTY-001

1. Establish this module and architecture boundary.
2. Add typed property/listing schemas and fixtures.
3. Build responsive search + property-detail frontend.
4. Add property registry API with authority checks.
5. Integrate NEOpass and NEO Pads eligibility.
6. Add read-only Counterparty/HOMESHARES information.
7. Add NEO Counter checkout only behind existing production safety gates.
8. Add automated trust-boundary and disclosure tests before production activation.
