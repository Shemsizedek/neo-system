# NEO-HOUSES-TX-013 / NCC-019 — Corporate Control, Distress Screening and Crown Chain Source Acceptance

**Development status:** Draft PR #1406. No actual property takeover, entry, management appointment, lien, deed, token issuance or mainnet publication. This is evidence intake and acquisition-screening software.

## Two active parcels
- 2502 Algerian Way, Houston TX 77098 — HCAD 0772210030001; 2026 appraisal $2,989,249; 24,328 SF of land.
- 2504 Algerian Way, Houston TX 77098 — HCAD 0772210020011; 2026 appraisal $602,258; 5,460 SF of land.
- HCAD lists both parcels under 2502 Algerian Way LLC with an effective owner-history date 2026-06-24. HCAD is NOT a title abstractor, and appraised values are NOT purchase prices.
- HCAD mailed two original 18-page PDF source documents in response to the existing public information request RE-200036487 on 2026-11-10. Exact private PDF file bytes match the prior internal SHA-256 / byte-size / page-count manifest. The actual PDFs and private correspondence are **not** committed.
- 2026 county deeds reportedly recorded June 25; certified copies, encumbrances, and signed seller-authority documents are still outstanding.
- The Gretna Courts Partial Replat No. 3 / PL42885 application is reported conditionally approved in July; no recorded final Harris County plat verified.
- City of Houston PIA W346601-110926 is merely acknowledged; no authenticated current code violation, legal abandonment, delinquency or foreclosure has been found.

## Counterparty integrity
- Secondary reporting connects 2502 Algerian Way LLC with **TeraWatt Infrastructure**, an EV-fleet charging company. This connection does not independently identify the LLC's members, controller or property-sale signatory.
- The specific official commercial inquiry address is `bd@terawattinfrastructure.com` as published at terawattinfrastructure.com. An initial contact inquiry was **already sent on 2026-11-06** and has not received a reply. Do not generate duplicate messages.
- **Do not substitute** `terrawatt.com`, `teraawatt.com` or similarly spelled brands/domains. They are not accepted evidence of identity for TeraWatt Infrastructure.

## Document and lien classification
A county deed, deed of trust, legal notice, foreclosure notice, tax account, LLC filing, title commitment, or city inspection is recorded as a **separate source class**. No one file's presence establishes legal effect.

For any nonbinding corporate acquisition, actual company signing authority must be verified against applicable records and/or a directly authenticated officer's mandate. A registered agent for service is not automatically empowered to sell property.

An adverse-possession investigation is supported as a fact-based route, but no possession period or possessory interest can be created by records intake, private notices, silence, changing locks, site upkeep or a Bitcoin broadcast. See Texas Civil Practice & Remedies Code Ch. 16.

### Source acceptance
`server/neo-property-manager/read-only-source-acceptance.mjs`:
- Calculates SHA-256 on actual bytes and compares them against a source receipt.
- Keeps source-family, source-ref and claimant/reported-party data distinct from authentication results.
- Rejects invalid source classes.
- Does not infer a certified conveyance, current mortgage, official delinquency, controller authority or management rights.
- Distinguishes `TeraWatt Infrastructure` commercial address from similar but unrelated names.
- Produces a research-only acquisition decision; no outbound network action or blockchain publication.

`tests/neo-property-manager/read-only-source-acceptance.test.mjs` adds six synthetic tests. All earlier NCC-015–018 suites remain required in the dedicated GitHub Actions workflow.

## Outstanding release gates
1. County Clerk instrument copies (grantors Oficina de Vino LLC, Stugotz Park LLC; grantee 2502 Algerian Way LLC, June 2026).
2. Texas Comptroller free entity name search and SOSPortal filing records where access is authorized. Confirm actual LLC manager/controller; no fee unless approved.
3. Recorded final replat number and actual City PIA W346601-110926 document production.
4. Property-specific secured-lender, deed-of-trust, tax-delinquency and trustee-foreclosure findings. The existence of online search interfaces is not a positive record.
5. Nonbinding owner/controller conversation if the initial inquiry receives a reply; offer, lender debt acquisition, joint venture or LLC-interest purchase each require their own actual authorization and evidence.
6. Private NEOpass evidence vault, signed source attestation, and read-only government adapters before production.
7. Independent CES/Bitcoin transaction authentication and deliberate human consent before any real chain broadcast.
8. Role-based access and signed management mandate before actual property operations.

## Source entry points
- https://comptroller.texas.gov/taxes/franchise/account-status/
- https://www.sos.texas.gov/corp/searches.shtml
- https://cclerk.hctx.net/Applications/WebSearch/RP.aspx
- https://cclerk.hctx.net/Applications/Websearch/FRCL_R.aspx
- https://www.hctax.net/Property/DelinquentTax
- https://plattracker.powerappsportals.us/
- https://houstontx.gov/pia.html
- https://www.terawattinfrastructure.com/
