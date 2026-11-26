# NEO-HOUSES-TX-014 / NCC-020 — Source Review Attestation & Deal Desk Approval

**DRAFT — no production merge, real property takeover, official deed recording, mainnet broadcast or signing key issuance.**

## Gate 020 result
- Original HCAD public-record PDFs for 2502 Algerian Way (0772210030001) and 2504 Algerian Way (0772210020011) are preserved outside the public repository. They were delivered in HCAD's November 10 public-information response under RE-200036487. The local byte hashes match the previously preserved Gate 013 manifest.
- HCAD data supports the listed 2026 account owner 2502 Algerian Way LLC, effective June 24, 2026. It is **not** a certified title commitment or attestation of beneficial owner, LLC manager or signatory.
- New NCC-020 `private-source-attestation.mjs` stages reviewer-attested SHA-256 PDF provenance, verifies Ed25519 signatures using a trusted public-key registry and produces an unpublished, nonce-backed opaque public receipt.
- A reviewer may attest the fact that they inspected matching file bytes and the provenance trail. **This must not be represented as a government or owner signature**, a certified deed, an enforceable lien, a court-ordered default or an authorization to enter/manage a parcel.
- CI target `node --test tests/neo-property-manager/*.test.mjs` succeeded at commit `36bc675aefb8898075221a0a867a4b97d3054f12` with 48 tests passing, zero failing. Code tests use **synthetic** files/ephemeral signing keys.
- Reviewer key enrollment, authorized signing, private vault storage, actual agency-origin authentication and live Bitcoin anchoring have **not** occurred.

## Current active acquisition threads
1. **2502 and 2504 Algerian Way**: owner of record per HCAD = 2502 Algerian Way LLC. Historical reported June 2026 grantors Oficina de Vino LLC and Stugotz Park LLC. June 2026 county deed instruments and final recorded plat still not obtained. Association to TeraWatt Infrastructure remains sourced from public third-party reporting, not an independently verified LLC manager record.
2. Existing TeraWatt commercial contact-verification email was sent November 6, 2026. No newer reply. **Do not duplicate the outreach**.
3. City Houston PIA W346601-110926 remains awaiting actual released records. A public-records request number is NOT a code-enforcement or abandonment determination.
4. Tax Office replied November 11 offering public account statements/receipts/payment history. A follow-up asking for those records, delinquency and tax-sale status for both accounts was sent November 12. No money owed, past tax delinquency or lien is established yet.
5. **Creekmont Estates:** broker Rosalinda Frias replied November 11 to the Nov 9 inquiry. On November 12, sent two proposed call times: Monday November 16 11am CST or Tuesday November 17 2pm CST. Buyer terms and inventory remain unverified; no offer made.

## Next technical acceptance
1. Enroll an authorized human reviewer through authenticated NEOpass and keep reviewer credentials/private keys solely in a secure signing device or HSM. Do not auto-create reusable credential files in GitHub.
2. Store exact source bytes in private vault and create source hash, size, source time, provider receipt and access log.
3. Have registered reviewer inspect agency context and sign the *private* claim, no source attachment or personal information on public Bitcoin chain.
4. Verify the signature against a policy-controlled reviewer registry and record approvals, audit trails and explicit limitations.
5. Keep NEO Property Manager read-only until valid signed owner/controller mandate, lawful occupancy rights and required licensing/insurance checks.
6. Approve any mainnet proof publication, deed filing, financing offer, secured-debt purchase or regulated property management in its own independent gate.

## Required acquisition primary records
- Harris County Clerk official deed grantor/grantee index for June 2026: https://cclerk.hctx.net/Applications/WebSearch/RP.aspx
- Texas Comptroller Franchise Tax entity search: https://comptroller.texas.gov/taxes/franchise/account-status/search
- Harris County Clerk foreclosure notices: https://cclerk.hctx.net/Applications/Websearch/FRCL_R.aspx
- Harris Tax Office statement/delinquency: https://www.hctax.net/Property/DelinquentTax.cshtml
- Harris County Maps and Condos for recorded plats: https://oce.harriscountytx.gov/Services/Permits/Platting/Platting-FAQ

## Legal-effect classification
The system handles adverse possession as a fact/evidence and counsel-review lane. No automatic possession start date, owner consent or title is inferred from constructive notice, silence, tending grounds, unilateral lock changes, recorded claims or broadcasts. No physical entry, postings or removal of third parties is authorized by this gate.
