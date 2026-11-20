# Project 144 — Counterpay inbound donations and sales (staging gate)

## Purpose
NEO Sales and NEO Temple Agents can prepare Bitcoin receiving requests linked to a commercial order or donation campaign. The same organizational receiving-wallet validation can be reused by NEO Counter and, after integration, Counterpay and NeoMask.

## Current implementation
- `server/neo-merchant-network/outreach-payment-requests.mjs`: noncustodial pure service; separate SALE / DONATION purposes. SALES require an exact integer-satoshi amount and order reference; TEMPLE may request an optional amount.
- Emits a BIP21 URI suitable for a Bitcoin wallet or independently rendered QR code, with an accessible minimal checkout page.
- Explicitly verified organization-controlled wallet bindings only. An agent-owned address must not be silently treated as authorized to receive funds for a foundation, Temple or merchant.
- One unique receiving address per request; keep addresses reserved across expiry and reorgs to prevent mistaken attribution. Service currently uses *in-memory state only* and needs durable storage and address allocation before real use.
- Idempotent request creation and status transitions `AWAITING_PAYMENT -> AWAITING_CONFIRMATIONS -> SETTLED_VERIFIED` require trusted server-side independently validated Bitcoin inclusion, exact destination and payment amount, and at least three confirmations. Read-only verifier callback must be provisioned by the server, not callers.
- No seed, private key, transaction signer, broadcasting, wallet generation, actual checkout hosting, outbound email, cold calling, Trello access, or automatic funds movement.

## Outreach workflow
1. NEO Temple Agent chooses approved campaign and opt-in recipients; request a voluntary contribution without suggesting tax deductibility unless the receiving organization and jurisdiction are verified.
2. NEO Sales Agent chooses a documented order/quote, approved organization wallet, exact BTC amount and expiry; no ambiguous BTC/USD exchange-rate claim without a separately verified rate and quote expiry.
3. At a legitimate conversation, offer a clear Bitcoin checkout link after the prospect agrees; distinguish donation from purchase and investments/securities.
4. Only after independent validation of receipt inclusion may NEO Books post a transaction and a sale move to paid/ready-to-fulfill. Do not treat a QR scan, wallet screen, mempool observation or client callback as completed settlement.
5. Human review/registered policy controls agent outreach, seller commitments, tax/charity compliance, and unusual payments. Do not impersonate buyers, automate unsolicited mass calling in violation of applicable laws, or promise guaranteed returns.
6. Agent wallet addresses are signer identities and workload bindings, not safe payment destinations until explicit organizational authority is established. Treasury and donation proceeds should be held in auditable institution-controlled addresses; public agent addresses can be shown only when approved.

## Release prerequisites
- Confirm actual Counterpay ChatGPT Sites source/runtime binding; wallet issuance PR #1408, internal eGaaS rail PR #1409 and agent wallet proposals PR #1380 are separate review gates.
- Review verified receiving address control proof and prepare a durable wallet/address reservation database with safe HD receive-only derivation and monitoring for multiple outstanding requests. Never publish a fixture Bitcoin address as a real destination.
- Wire independent Bitcoin Core and Counterparty verification, test reorgs, replacement transactions, partial payments, retry delivery, restart recovery and multi-order conflict handling.
- Build owner-authorized landing page with HTTPS, genuine QR renderer, audit, donor opt-in/consent and rate limits. Verify donation/tax/fundraising and outbound calling/email legality.
- Connect Trello only after explicit user connection; do not move names, contact details, or prospect data onto Bitcoin or public payment links.
- Limit agents to bounded outreach and inbound invoice preparation; outbound payments require separate NeoMask signing and budget gates.
- No production deployment, payment activation, Bitcoin broadcast, token issuance, or new spending from this gate.

## Validation
Local Node 22 staged test run: 11 tests passed, 0 failed for payment request creation, BIP21, retry safety, authorization, no-verifier failure, invoice payment status, and privacy.
The GitHub repository test file needs CI confirmation after branch is pushed. This is a staging source change, not a confirmed operational receiving gateway.
