# NEO-HOUSES-TX-012 / NCC-018 — HCAD Source Capture, Owner Qualification & First Read-Only Crown Link

**Development only — draft PR #1406. No property control, court filing, lien, token issuance, mainnet Bitcoin publication, title warranty, or charged record order.**

## Production pilot target
- 2502 Algerian Way: HCAD account `0772210030001`, source-reported owner 2502 ALGERIAN WAY LLC effective 06/24/2026; 2026 appraised $2,989,249.
- 2504 Algerian Way: HCAD account `0772210020011`, source-reported owner 2502 ALGERIAN WAY LLC effective 06/24/2026; 2026 appraised $602,258.
- Both underlying 18-page appraisal PDFs received from HCAD's public-information response November 10, 2026. Original PDFs remain private, not committed.
- An HCAD appraisal history is not a county title examination, certified deed, lien release, or right of entry or management.

## Read-only adapter
`server/neo-property-manager/hcad-readonly-evidence.mjs`:
1. Receive original private PDF bytes and expected public account in a closed two-parcel allowlist.
2. Reject malformed input; calculate original SHA-256 and create restricted source receipt.
3. Source-reported owner, effective date and appraisal value remain explicitly identified as **source-reported**, with no independent digital issuer signature, certified deed or corporate control assertion.
4. Link a restricted evidenceEvent to NCC-015 Crown hash chain; emit a *not-yet-published* nonce-backed public commitment.
5. Produce a nonbinding Deal Desk research signal only. No management activation.

`tests/neo-property-manager/hcad-readonly-evidence.test.mjs`: five synthetic tests for PDF ingestion, two accounts, chain linkage, privacy and invalid inputs. Dedicated property-manager workflow (NCC-015–018) and general CI passed at commit `259c946d63b9c9ebed42f75f232f8cef52093e56`.

## Corporate acquisition qualification
Reported TeraWatt Infrastructure affiliation and July 2026 Gretna Courts Partial Replat No. 3 remain leads from public reporting, **not signed company authorization or recorded final map**. Correct next checks:
- Grantor/Grantee deed index June 2026 at Harris County Clerk, both original deeds.
- `2502 Algerian Way LLC` Texas Comptroller taxable entity status and SOSPortal records; authorized manager/agent names before negotiation.
- Original replat application PL42885 and separately recorded final plat, if any.
- Actual production for City PIA `W346601-110926`; prior acknowledgment is NOT proof of vacancy or code enforcement.
- Public property-tax delinquency and foreclosure records, if any.

## Integration gates before activation
- Authenticate source receipt and custody origin with signed/traceable metadata.
- Private NEOpass evidence vault, access-control audit, retention and PII redaction.
- Title and delegated manager authority before any physical property access or commercial property operations.
- Legal review of adverse-possession fact history on a separate track; owner nonresponse or a public Bitcoin message cannot manufacture possession time, consent or title.
- Independent CES/Counterparty verifiers and explicit public-hash publication approval.
- Deal Desk human signoff before any financial binding transaction, outreach beyond nonbinding inquiry, or regulatory filing.

## Source entry points
- HCAD: https://hcad.org/quicksearch/
- Harris County deeds: https://cclerk.hctx.net/Applications/WebSearch/RP.aspx
- Harris County maps: https://cclerk.hctx.net/Applications/WebSearch/MC.aspx
- TX Comptroller: https://comptroller.texas.gov/taxes/franchise/account-status/
- City PlatTracker: https://plattracker.powerappsportals.us/
