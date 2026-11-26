# NEO-STAFF-005 — Merchant Activation and First-Sale Acceptance

**Gate result 2026-11-08:** READ-ONLY VERIFICATION COMPLETE; PRIVATE COMMISSION LEDGER CREATED; LIVE SALE, MERCHANT AND HIRING ACTIVATION **BLOCKED**.  
**Program:** NEO Staffing + World Trust Authority coordination.  
**Status source:** Draft PR [#1369](https://github.com/Shemsizedek/neo-system/pull/1369); intake [#1373](https://github.com/Shemsizedek/neo-system/issues/1373).

## Verified observations

1. The official Neoteric SKU map `integrations/minicart/neoteric-sku-map.yaml` explicitly states `publication_state: NOT_YET_CONFIRMED`. The manifest `integrations/minicart/neoteric.manifest.yaml` states `status: INTEGRATING`, `api_data_bridge: not_enabled`. Its approved-price specification lists `NEO-NT-SVC-001` Noological Dialogue for **$144 per hour** (non-diagnostic) and educational SKUs, but does not establish production readiness or orders.
2. Public URL checks via external reader on 2026-11-08 for `https://neoteric.holytemples.org/`, `https://neotericmethod.minicart.com/` and `https://tabernacle.holytemples.org/` did **not return accessible storefront evidence**. This is "unverifiable from this check," **NOT** a proven outage. There is an existing read-only storefront verifier `scripts/neoteric/verify-storefront.mjs`; a successful independent run plus real provider-side order evidence is still needed.
3. PayPal official documentation confirms **no-code PayPal Business payment links** support one-time fixed-price product/service payments. The merchant account owner must authenticate and create/confirm the link via the PayPal Business dashboard. NO valid, merchant-owned payment link was identified; no assistant-generated URL or payment test exists. Official guide: https://developer.paypal.com/payment-links-buttons/create-payment-link/ .
4. Gmail targeted recruiting and PayPal-merchant searches showed **zero NEO Staffing opt-in applicants** and **no verified business payment-link/real Noological Dialogue receipt**; presence of personal PayPal statements or nonmerchant PayPal email DOES NOT prove a PayPal Business merchant checkout.
5. Connected Calendly account `https://calendly.com/nooneuniversity` currently lists a single active **free 30 Minute Meeting** (https://calendly.com/nooneuniversity/30min). It is **not** a verified 60-minute paid Noological Dialogue, provider availability, refund or fulfillment mechanism. No new appointment event was created.
6. Recruitment Facebook outreach via Metricool post **421119917** remains **PENDING**, scheduled for **November 9, 2026, 09:00 America/Chicago**. This is an expression of interest and not a published vacancy, offer or completed post.
7. Holy Temples `https://holytemples.org/temple-giving/` publicly provides Bitcoin giving-address information. This is evidence of public instructions only; payee legal identity, legal donor tax-deductibility and donation reconciliation remain unverified. Charitable donations are **not eligible for sales commissions**.
8. Private ATS: https://docs.google.com/spreadsheets/d/1V8-5jTYfMGHkPE6xGPcNtqpV39AyIeFx_bH0O2kpT5o/edit . New tabs `Merchant_Activation` (11 evidence gates) and `Commission_Ledger` (order reconciliation, gated commission logic) created on 2026-11-08. The ledger is **empty**; calculations are templates, **not proof of revenue or payable obligations**.

## Merchant acceptance sequence — do in this order

### A — Contracting seller and delivery
- [ ] Independently verify the actual current seller legal name, business standing, authorized contracting signatory, service provider and authority to offer `NEO-NT-SVC-001`.
- [ ] Approve a specific **hourly** nonclinical deliverable, provider, appointment duration, scheduling calendar capacity and consent/intake boundary. Noological Dialogue may not be presented as regulated treatment or diagnoses.
- [ ] Approve customer purchase terms, informed scope, cancellation/refund policy, chargeback/support contact, handling of customer records, restrictions and permitted jurisdiction.
- [ ] Place legal/identity support evidence only in appropriate restricted storage; no personal identity, bank documents, tax IDs, medical intake or client sessions in public GitHub.

### B — No-code merchant link (NO new paid hosting needed)
- [ ] Authenticate the actual seller in PayPal Business. Verify account eligible to receive commercial payments in approved currency and territory.
- [ ] Go to **Pay & Get Paid → Create Payment Links and Buttons**. Choose **Fixed price** and the exact approved service title `Noological Dialogue` / SKU `NEO-NT-SVC-001`, amount **USD $144** for the approved 1-hour unit; configure relevant sales tax and receipts where required.
- [ ] Set customer terms and contact/refund instruction on the proper checkout or linked sales terms. Do not collect health/intake data in ordinary payment metadata. Ensure PayPal link's displayed payee matches contracting entity.
- [ ] Create and **privately verify** the resulting genuine merchant URL with a second authorized reviewer; share public URL only after legitimacy confirmed. The assistant has not created this URL.
- [ ] Record redacted seller verification and actual payment link in `Merchant_Activation`. No username/password, API key or merchant secret in Sheets.

### C — Real sale and commission ledger (not a simulated purchase)
- [ ] Confirm a genuine customer voluntarily purchases under the approved terms.
- [ ] Record the actual merchant transaction reference and whether payment is **CLEARED**, not merely authorized/pending. Record collected gross, permitted fees/taxes/refunds and net receipts, with non-sensitive client reference only.
- [ ] Verify completed delivery and expiry of applicable refund window.
- [ ] If a worker legitimately sourced the customer **after** an executed and lawful arrangement, record approved referral attribution, commission rate, signed agreement and payout approval before setting amount payable.
- [ ] Reconcile provider statements, service delivery and commissions. Never pay from a false order or infer commission from a price spec or test transaction.

### D — Recruiting and contractor status
- [ ] Confirm candidate opt-in, country/eligibility, worker classification and needed tax/work authorizations. No automatic "contractor" status from commission-only label.
- [ ] Approve written commercial commission schedule, revenue basis, refund treatment, arbitration/complaint process and payment timing for the **actual seller**. 15% scenario in earlier gate remains **unapproved**.
- [ ] Human principal review of real agreement. Only after it is genuinely signed, create least-privilege sales permissions (no wallet access, production write access, treasury authority or capacity to bind seller).
- [ ] Charitable donor stewardship workers use appropriately lawful volunteer or funded wage/fee arrangements, **never percentage of donated amounts**.

## Release classification

**PASS:** creation of two restricted operational tracking tabs and a defined read-only verification protocol.  
**OPEN:** seller/merchant and service-delivery evidence, transaction and link, customer terms, applicant consent and approved commission.  
**NOT DONE:** first actual sale; merchant owner login; payment-link creation; any purchase test; hiring, candidate contact, wage/payment or production deployment.  
**NEXT GATE:** `NEO-STAFF-006` — verified merchant link and service calendar, first legal customer order, consenting applicant screening and executed approved worker contract.

## Official references

- PayPal no-code payment-link setup: https://developer.paypal.com/payment-links-buttons/create-payment-link/
- PayPal customer help: https://www.paypal.com/us/cshelp/article/how-do-i-create-a-pay-link-and-button-help262
- IRS worker classification: https://www.irs.gov/businesses/small-businesses-self-employed/employee-common-law-employee
- Texas paid commissions and wages: https://efte.twc.texas.gov/g_regular_rate_commission.html
- AFP professional fundraising ethics: https://afpglobal.org/ethics/code-ethical-standards
