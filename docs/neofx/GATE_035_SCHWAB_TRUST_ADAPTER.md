# NEO-FX-035 — Existing Schwab Trust Brokerage Adapter

Status: DISCOVERED / DATA-CONNECTED EXTERNALLY. Not authorized to trade.

## Privacy
A user-confirmed trust account is already linked to a financial-data service. This connection is NOT NEO FX OAuth and does not grant NEO FX access to broker positions, real-time buying power or order execution. Never commit account numbers, OAuth secrets, identity documents, beneficiaries, tax records, balances, or account holder details in this public repository.

## Recommended integration order
1. Schwab developer portal: https://developer.schwab.com/
2. Verify trustee and trading authorization, and Schwab API eligibility for the actual trust account.
3. Register a dedicated NEO FX OAuth application in the portal. Confirm API product permissions, redirect URI, and production app approval. OAuth app is scoped per broker and account.
4. Use a private Google Cloud Run callback endpoint and Google Secret Manager. Never place the OAuth client secret/token in public HTML, source code, logs or shared tenant state.
5. Start with read-only positions, balances, quotes and orders, subject to official API permissions. Verify source timestamp, discrepancies and staleness.
6. Validate instrument permissions, cash availability, open orders, order state, market hours and per-account kill switch in paper/sandbox tests.
7. Live orders require separate signed trustee authorization, Schwab API production approval, risk certification, and explicit per-account activation. Default LIVE_EXECUTION=false.

## Trust and custody boundaries
- Trust account assets remain owned by trust, not operating company.
- NEO FX is a software display/router, not a transfer of custody.
- No pooled balances, no asset transfers, no implied discretionary authority.
- Different accounts, fiduciaries and regulators receive distinct permissions.

## Proposed secure record (private DB, not GitHub)
provider=schwab; entity_type=trust; internal_account_uuid=(generated); external_account_reference=(encrypted); enrollment_state=EXISTING_DATA_LINK; oauth_state=NOT_STARTED; read_only_api=NOT_AUTHORIZED; live_orders=DISABLED.

## Separate new applications
Shelton Estate & Co. remains the proposed applicant for its own organizational brokerage account(s). Schwab trust account connection does not waive separate entity verification at IBKR, OANDA or elsewhere.

## Acceptance evidence
Official developer product approved; authorized trustee grants OAuth; broker API returns account list showing correctly scoped trust account; no credentials exposed; data reconciled; live orders remain rejected by backend.
