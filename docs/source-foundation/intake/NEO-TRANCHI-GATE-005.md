# NEO-TRANCHI-GATE-005 — Business account & integration qualification
Updated: 2026-11-15 (America/Chicago)
Owner: Shelton Estate & Co. | Existing NEO Market Agent, real-estate sourcing sub-lane
Parent gate: [NEO-TRANCHI-VENDOR-GATE-004](./NEO-TRANCHI-VENDOR-GATE-004.md)
Status: **QUALIFICATION OPEN** / **NO TRANCHI ACCOUNT** / **NO LICENSED DATA CONNECTION** / **NO PAID CONTRACT** / **NO REVENUE EVIDENCED**

## Corrected business thesis
Explore **lawful estate- and probate-related property opportunities** in Houston and neighboring counties as an incremental business line for Shelton Estate & Co. Possible paths: purchase and disposition of actual interests; permissible assignments of enforceable purchase options/contracts with correct disclosures; and separately negotiated services within applicable licensing rules. A probate or deceased-owner tag is NOT evidence of abandonment, no heirs, vacancy, sale availability or seller consent. Existing Houston 20+ unit / ≥4% credible cap-rate monitor remains in place; do not silently swap single-family probate leads into that buy-box.

## Research classification as of gate date
| Question | Evidence | Status |
| --- | --- | --- |
| Identifiable company | Crunchbase lists Tranchi AI LLC as active; verify formal state registration and contractual payee before subscribing | third-party entry, not independently authenticated registration |
| Features | Whop Tranchi Pro page advertises 44 agents for probate/auction, wholesaling, off-market, distressed and paperwork | **vendor claim** |
| Functional product demo | https://learn.tranchi.ai/demo is a public presentation titled 'Tranchi AI Demo' | accessible **demo page**, not independent hands-on account acceptance |
| Signup | No usable, official no-card business signup workflow could be confirmed through accessible public pages; marketing funnel includes booking and training forms | **unconfirmed** |
| Free training vs product trial | https://learn.tranchi.ai/ public content is training/booking, NOT confirmed hands-on software trial. Some forms solicit phone and marketing SMS/email consent. | distinguish training from account |
| Paid pricing | Tranchi Operator advertised as contact-sales in secondary materials. Whop Pro listing inspected, but final billed prices/terms unavailable. | **unconfirmed** |
| API/export | No Tranchi customer-facing API, webhook, CSV/JSON export, license terms or MCP connector documentation independently verified | **unconfirmed**, do not invent endpoints |
| Planned finance system | November 10, 2026 Tranchi press announcement proposes internal embedded DSCR loan workflow before end-2026; not evidence of active lending or NEO-accessible external API | **planned vendor assertion** |
| Track record | Statements of 2,742 users, $20K monthly, 94-95% automated and testimonial deal proceeds not independently audited | **unverified promotional performance** |
| Trust | Automated site reputation tools give cautionary ratings; not dispositive fraud findings | **risk review only** |

Source links: https://tranchi.ai/ ; https://learn.tranchi.ai/demo ; https://learn.tranchi.ai/book-call ; https://whop.com/tranchi-ai-llc/tranchi-monthly/ ; https://www.crunchbase.com/organization/tranchi-ai ; https://columbia.newsnetmedia.com/story/580668/tranchi-announces-ai-powered-dscr-financing-platform-targeting-fully-automated-real-estate-lending/ .

## Onboarding evidence checklist
- [ ] Confirm legal seller, company registration, subscription contracting party, customer support and invoicing identity.
- [ ] Written business/organizational account eligibility, named user, roles, MFA/passkey support, allowed service accounts, privacy terms, security documentation.
- [ ] Document free/no-card trial eligibility. The **training** page is not proof of a software trial.
- [ ] Quote plan prices, taxes, credits, lookup charges, SMS costs, monthly/annual commitment, renewals, cancellation and enforceable refund terms. Maximum spend until approval = **$0**.
- [ ] Obtain written feature coverage for Harris, Fort Bend and Montgomery counties, with source links, timestamp accuracy and probate/estate vs vacancy distinction.
- [ ] Clarify if Tranchi supports 20+ unit multifamily alongside its residential estate/probate lane, and if any user-supplied rent rolls/NOI can be processed.
- [ ] Obtain API/CSV/JSON export documentation, rate limits, webhook capability, permitted automation, data ownership/licensing and revocation/termination rights.
- [ ] Confirm that buyer/seller messaging, offers, documents, e-signatures, financing applications, orders and payments can all be **disabled** until explicit separate approval.
- [ ] No PII uploaded to a public repository; no Tranchi credentials, tokens or session cookies embedded into NEO/GitHub or automation prompts.

## Proposed NEO architecture — not a claimed live integration
`Tranchi authorized demo / licensed API or export`
→ `NEO intake adapter (read-only, when permitted)`
→ `SCROLL source capture + checksum`
→ `ATHENAEUM provenance / discrepancy adjudication`
→ `NEO Market Agent / Real Estate Deal Desk triage`
→ `NEO Algo independent underwriting and economic model`
→ `ORIGIN human approval for outreach, account purchase, contracting or capital action`.

Preferred transport: documented authenticated read-only API > approved and licensed CSV/JSON export > manual redacted demo samples. No session scraping, robots circumvention, hidden endpoint speculation or credential sharing. No actual adapter deployed. Store unknown values as null, not inferred.

## Minimal candidate record accepted by the proposed adapter
See [read-only contract](./NEO-TRANCHI-GATE-005-readonly-contract.json). Every lead carries vendor name, source URL, original record reference, captured_at UTC, county, asset category, deal status and price basis. For real probate/estate status capture original docket/source plus `authority_verified` separately; do not label deceased owner with no heirs. All owner personal data stays in restricted systems, not GitHub.

## Pilot test
1. With vendor permission obtain a 14-day **no-card/no-expense** access path or sales-assisted demonstration. Require sample of 20 distinct eligible Houston-area estate-related properties; include separately any credible 20+ unit multifamily matches.
2. Independently check >=10 records against county clerk, appraisal and probate sources. Target >=90% accuracy on verifiable core fields, 100% source traceability for any estate status, and **zero fabricated signed contracts / completed closings**.
3. Measure new unique qualified leads, freshness, duplicates, time saved and cost per *verified actionable* opportunity, not theoretical assignment fee. Hold revenue at zero until cleared receipts from actual contracts.
4. If no permitted data export, close integration gate as blocked, regardless of promotional claims.

## Vendor due-diligence contact prepared
Gmail **draft only**, addressed to publicly listed support@tranchi.ai, subject:
“Shelton Estate & Co. | Tranchi AI business account, probate sourcing and integration qualification”
Draft created Nov 15, 2026, not sent; user review required before dispatch. No account creation, payment, contact to property owners or access change.

## State of decision
**GO:** read-only research, compare capabilities, preserve qualification evidence, review demo, prepare lawful pilot.
**HOLD:** Tranchi signup until official account flow and terms are independently confirmed; any paid plan and any API connector until G1–G4 acceptance.
**NO-GO:** autonomous contact with owners or heirs, representations of heirless status, contract acceptance/signing, submitting financing applications, opening lines of credit or acquiring any property without separate authorization.

## Automation
Work remains a **sub-lane of existing NEO Market Agent**, not a new schedule. Existing 02:00/08:00/14:00/20:00 America/Chicago cadence retained. When the vendor email is actually sent, its meaningful replies may be reviewed by the existing parent; do not invent delivery or send. Report only change in signup feasibility, actual pricing, licensed integration, measurable data accuracy or new blockers.

## Next gate
NEO-TRANCHI-006 — vendor response or authenticated demo, evaluate permitted account creation and run sample import in a **non-production isolated test**, then decide go/no-go for a commercial pilot.
