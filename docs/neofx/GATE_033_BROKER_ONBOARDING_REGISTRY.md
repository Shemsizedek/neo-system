# NEO-FX-033 — Fresh Institutional Broker Onboarding Registry
Status: APPLICATION PREPARATION ONLY. No broker accounts opened. No user identity verified. No financial execution enabled.

## Track A: NEO FX proprietary organizational account
Provider priority 1: Interactive Brokers (organization/small business account, not introducing broker unless eligibility and registration are established).
Applicant legal entity: UNCONFIRMED; must be chosen by authorized signatory before submission.
Entity formation jurisdiction: PENDING.
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
