# NEO-HOUSES-TX-013 / NCC-019 — Corporate Control, Secured Debt & Internal Source Attestation

**Status: DRAFT implementation, no merge/deploy, public filing, deed transfer, land entry, foreclosure, or mainnet broadcast.**

## Two-parcel real-source custody
A public-information response from Harris Central Appraisal District, request **RE-200036487**, contained two 18-page PDF documents. Their original bytes were processed privately, not committed to GitHub:
- `0772210030001-18-26.pdf` for 2502 Algerian Way: **1,547,446 bytes**, SHA-256 `7ffc4d32f47c6c41a5e19a7898ee95e615fbffa3fb06a7a9c5712c0070aee2f2`.
- `0772210020011-18-26.pdf` for 2504 Algerian Way: **1,568,105 bytes**, SHA-256 `46ff61419d06b89440c87515bb5d6e70fa027e2162b0993253972a1fbd6045b5`.

Both HCAD histories show 2502 Algerian Way LLC as the **appraisal-listed** owner effective June 24, 2026. HCAD itself disclaims authority to resolve competing title and lien priority. The original PDFs are in a restricted local workspace only, not a server API or public evidence vault yet.

## Current acquisition intelligence
- The **Harris County Clerk** has confirmed by direct email that it supplies recorded documents but does not conduct title/lien/ownership research. Obtain county indices by company grantor/grantee and retrieve two June 2026 deeds plus security/assignment/release images. No certified deeds or source-backed lienholder were obtained in Gate 013.
- A public Houston community report attributes acquisition and Gretna Courts Partial Replat No. 3 activity to 2502 Algerian Way LLC, reportedly affiliated with TeraWatt Infrastructure. That does **not** establish the officer/controller or precise parent-company relationship. Verify registered agent, corporate member/manager and actual authority via Texas Comptroller and Secretary of State, avoiding similarly named web domains.
- City of Houston public information request `W346601-110926` remains acknowledged with no actual responsive condition findings yet found; never treat the acknowledgment as a nuisance, neglect or abandonment determination.
- No parcel-specific assignable loan, lender, secured debt price, foreclosure, tax sale or legal possession period was independently confirmed. Do not describe either target as abandoned/foreclosed based on missing search results.
- Plausible business models requiring underwriting include a 5,408-SF office at 2502 and 3,746-SF combined older residential structures at 2504, but the replat/development plan may materially change permitted use.

## NCC-019 software
`server/neo-property-manager/source-attestation.mjs`:
- Computes SHA-256 **from original PDF bytes** (not a user-supplied digest); enforces an origin classification and timestamps.
- Optionally compares expected hashes and rejects mismatches.
- Signs an internal custody **review** with Ed25519 and verifies the review only against a separately configured trusted public key registry.
- Signature says *internal source bytes and chain-of-custody reviewed*. It explicitly **does not claim a government signature, verified title, recorded mortgage, corporate control or property management rights**.
- `controllerAndDebtGate` keeps asset acquisition and entry/management authorization false even if a real deed or assignable loan lead is later verified.
- No external network/database requests, key storage, wallet signing or chain publishing.

`tests/neo-property-manager/source-attestation.test.mjs`:
- Five synthetic tests: original-byte hashing; changed source rejection; trusted internal signature; untrusted key/tampering rejection; debt/title authority separation.
- Combined tests executed by the dedicated GitHub Actions PR workflow `.github/workflows/neo-property-manager-tests.yml`; check actual workflow acceptance before merging.

## Before production
1. Privately provision trusted reviewer identities and rotating/revocable keys with NEOpass and audit trail.
2. Authenticate agency delivery, original file receipt metadata and any official digital signature independently; do not trust self-declared source channels.
3. Implement and verify a guarded read-only county instrument index and exact recorded legal description lookup; licensed title review for lien priority.
4. Verify controlling LLC decision-maker and proper signing authority before any binding outreach or acquisition.
5. Return actual City code/permit information and official tax status to Deal Desk for suitability analysis.
6. Preserve redacted public Crown commitments distinct from private exhibits, original hash values and legal title; obtain explicit approval before actual Bitcoin broadcast.
7. No alleged adverse possession from notice, a photo, lawn work, lock action or metadata itself. Evidence of actual statutory possession must be separately established and assessed by counsel.

## Public records
- Harris County Real Property Index: https://www.cclerk.hctx.net/applications/websearch/RP_R.aspx
- Harris County Maps & Condos: https://www.cclerk.hctx.net/Applications/WebSearch/MC.aspx
- Texas Comptroller Franchise Tax Search: https://comptroller.texas.gov/taxes/franchise/account-status/
- Houston PlatTracker: https://plattracker.powerappsportals.us/
- City PIA: https://www.houstontx.gov/pia.html
- HCAD: https://hcad.org/quicksearch/
