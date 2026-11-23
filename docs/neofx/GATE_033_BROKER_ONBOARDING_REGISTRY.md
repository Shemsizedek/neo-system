# NEO-FX-033 — Fresh Institutional Broker Onboarding Registry
Status: APPLICATION PREPARATION ONLY. No broker accounts opened. No user identity verified. No financial execution enabled.

## Track A: NEO FX proprietary organizational account
Provider priority 1: Interactive Brokers (organization/small business account, not introducing broker unless eligibility and registration are established).
Onboarding decision: start a new application only after exact entity legal form and jurisdiction are established. Prefer CASH permissions at opening, no margin authorization by default.
Proposed applicant operating name: Shelton Estate & Co. (user selected; legal form/registered name unverified). Authorized signatory and provider must confirm exact legal entity before submission.
Entity formation jurisdiction: PENDING; do not infer from office location.
Tax classification / EIN: PENDING; NEVER COMMIT CONFIDENTIAL IDs.
Controlling officer and beneficial owner KYC: PENDING; supply through broker secure portal.
Entity documentation: PENDING.
Account purposes, instruments and jurisdiction: PENDING.
Funding ownership and source of funds: PENDING.
Approval: NOT SUBMITTED.
Read-only API connectivity: NOT AUTHORIZED.
Paper API certification: NOT STARTED.
Live order routing: DISABLED.

## Track B: Foreign exchange
Provider priority 2: OANDA. Verify country and entity eligibility and account product before application; authorized signatory completes identity checks on official secure portal. No personal credentials in Git.

## Track C: MT4/MT5 global regional brokers
Broker-by-broker due diligence for entity jurisdiction, regulator, eligible client country, permissible products, API, supported order types, data licenses and external platform access. Do not accept arbitrary unlicensed brokers.

## Track D: Institutional/introducing broker program
Separate pathway from proprietary account. Determine the actual intended activity (software vendor only / introducing / managed accounts / custody / broker-dealer / investment adviser). Obtain counsel review and proper registrations as applicable BEFORE enabling third-party customer execution.

## Vendor-specific entry and requirements
IBKR Small Business requirements: https://brokerage.ibkr.com/en/general/what-you-need-sb.php
IBKR institutional API: https://www.interactivebrokers.com/campus/ibkr-api-page/web-api-account-management/
OANDA US entity account: https://www.oanda.com/us-en/trading/corporate-account/
IBKR inquiry: api-solutions@interactivebrokers.com (confirm legal applicant and use case before outreach)

## Security and technical policy
One NEO FX UI; isolated per broker account/tenant/jurisdiction. Secrets in Google Cloud Secret Manager, access via dedicated service identity; account-wide server-side kill switch; no execution without verified broker session, permissible contract, compliance and risk policy, user-approved final live gate. Market quotes are source-labeled and must never be invented. Verify each broker's actual API permissions. Provide read-only onboarding first.

## Human-required steps
- Authorized signatory chooses actual legal applicant and capacity.
- Signatory independently verifies identity, beneficial ownership, tax information, source of funds and agreement disclosures in provider's portal.
- Provider conducts KYC and approves brokerage application.
- Only then activate private API account authorization and confirm read-only balances.

## Gate 034 — applicant eligibility audit (2026-10-12)
- Shelton Estate & Co. selected by user as proposed applicant. This does not establish incorporated legal status or eligibility.
- IBKR US Small Business account requires tax ID, control-person and shareholder data, finances, proof of business existence and authorization documents according to legal form: https://brokerage.ibkr.com/en/general/what-you-need-sb.php
- OANDA US accepts US-registered corporations, general partnerships, LLCs, LLPs and trusts; not all informal organizational forms. Official source: https://www.oanda.com/us-en/trading/corporate-account/
- OANDA requires entity documents, identity verification, and a named-person email for application contact; no generic shared inbox: https://help.oanda.com/us/en/faqs/open-entity-corporate-account-us.htm
- Do not claim application submitted, account activated, broker API credentials issued, or live trade approved. Applicant must attest, sign and complete KYC directly in secured broker portal.
- First missing decision: What exact registered legal entity type and jurisdiction does Shelton Estate & Co. have? Then gather non-sensitive document inventory. Private EIN/SSN, identity IDs and banking details must be provided only in secure broker workflow.
