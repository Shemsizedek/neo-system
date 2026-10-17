# NEO-FX-043 — Alpaca, Tradier and IBKR staged onboarding

Status: APPLICATION LINKS VERIFIED; REGISTRATION NOT SUBMITTED; NO ACCOUNTS CONNECTED; LIVE EXECUTION DISABLED.
Applicant for business applications: Shelton Estate & Co., exact registered entity still unverified.

## 1. Alpaca — immediate developer simulation
Official: https://app.alpaca.markets/signup
Reference: https://docs.alpaca.markets/us/docs/paper-trading
Eligibility: Paper Only account open to global email registrants; no funded live account necessary. Paper endpoint https://paper-api.alpaca.markets (separate from live https://api.alpaca.markets).
User action: register, verify email, generate paper-only keys in Alpaca's private dashboard. Do not send keys in chat. Store in GCP Secret Manager with least-privilege service account. Connector should start with GET /v2/account and quotes; no POST /orders until paper routing certification.
Public NEO FX OAuth customer access is separate from self-use API keys; requires Alpaca app/product approval. https://docs.alpaca.markets/us/docs/about-connect-api

## 2. Tradier — second sandbox
Official: https://tradier.com/
Documentation: https://docs.tradier.com/docs/getting-started
Requires Tradier brokerage account to obtain sandbox token in account API settings. Sandbox: https://sandbox.tradier.com/v1; production: https://api.tradier.com/v1. Public third-party app needs partner approval. Keep Tradier sandbox-token exclusively server-side.
Entity account eligibility and legal status must be confirmed with Tradier before using Shelton Estate & Co. as applicant. No registration yet.

## 3. IBKR — organization global integration
Official: https://www.interactivebrokers.com/en/accounts/required-minimums.php
Documents: https://www.interactivebrokers.com/en/general/what-you-need-sb.php
Gather exact registration name, organization legal type and jurisdiction, tax classification, controllers, ownership, entity formation docs, authorized trading officer proof, permissible products and source-of-funds statements. No sensitive values in Git. Brokerage application submission by authorized signatory through secure broker portal only.

## Controls
Never misrepresent a personal account as owned by Shelton Estate & Co. The Shamuel Family Trust at Schwab is a separate existing trust-owned account and must never be consolidated into brokerage cash, ownership, or legal title with the proposed business account.
NEO_FX_LIVE_TRADING=false; broker order routes disabled.
Public quotes: label venue, feed timestamp and market-data entitlement. Do not redistribute brokerage feed without license.
Account status: NOT_STARTED -> EMAIL_VERIFIED -> KYC_PENDING -> BROKER_APPROVED -> API_READ_ONLY_VERIFIED -> SANDBOX_CERTIFIED -> LIVE_APPROVED -> LIVE_ENABLED. Require evidence for each transition.

## Immediate operator work
- User signs up at Alpaca using an authorized business/development email; generate paper keys, grant no funding instruction.
- Independently confirm Shelton Estate & Co.'s actual legal structure before business applications.
- Provision private Google Cloud secrets and connect authorized read-only/paper APIs (requires Google Cloud and broker credentials access).
