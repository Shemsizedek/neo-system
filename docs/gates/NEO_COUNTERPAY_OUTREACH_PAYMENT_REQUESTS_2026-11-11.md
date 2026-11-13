# Project 144 — Counterpay donations and sales outreach (staging gate)

## Outcome
A BTC-only, noncustodial payment-request generator for NEO Temple and NEO Sales agents. It creates BIP21 URI/QR payloads and a mobile-oriented checkout HTML fragment, with controlled recipient bindings, replay protection and explicit chain-verification boundaries. **It does not create QR bitmap images, send outreach, collect funds itself, connect Trello, or move money.**

Source: `server/neo-merchant-network/outreach-payment-requests.mjs`. Test: `node --test server/neo-merchant-network/outreach-payment-requests.test.mjs`.

## Outreach workflow
1. NEO Sales Agent or NEO Temple Agent selects an approved prospect/campaign and chooses either **SALE** (preexisting order with fixed satoshi amount) or **DONATION** (open or fixed amount). Donor and prospect contact details stay in private CRM/Trello—not Bitcoin URI or a public checkout page.
2. A trusted administrator establishes a verified NEO-organization receiving address binding using an independently authenticated wallet-control proof. Agents may not invent addresses or receive organization income in unverified personal/agent wallets.
3. Agent may prepare an idempotent request only using a reserved, unique receiving address. The request produces `bitcoin:<address>?amount=<btc>&label=...` (BIP21), an address, expiration, and a public checkout preview. For Bitcoin QR, a presentation app must encode `qrPayload` exactly; QR rendering is not implemented in this gate.
4. Approved, truthful outreach may contain this link or a URL to an independently secured checkout site; do not substitute an unverified staging page for the protected Counterpay Sites runtime.
5. A trusted read-only blockchain verifier, configured by the service and not the agent, must prove network, recipient address, exact amount when required, unambiguous output match, active-chain block hash/inclusion, and minimum confirmations. Tests use a synthetic verifier, not live Bitcoin proof.
6. Reconcile donation income separately from commercial revenue in NEO Books; a receipt can be issued only after verified settlement and classification. No automatic promises of donation tax deductibility, government authority, discounts, or completed sales.

## Critical limitations
- In-memory request and address reservation are **not production durable**. Before live use add persistent transactional storage with uniqueness constraints across restarts, per-request HD watch-only address derivation from an approved organization wallet (no server signing keys), wallet-control attestation and recovery policy.
- This version reserves one receiving address per request, including expired requests. A shared address is intentionally not considered enough to attribute arbitrary incoming BTC to a donor or a sale.
- No rate-lock or USD/BTC quote: sales use fixed **satoshis only** and an externally agreed amount. Add explicit exchange-rate source, quote expiry and reconciliation for USD-priced sales in a later gate.
- `observe()` accepts only trusted verifier output and cannot be reached via a public HTTP endpoint; no signer or broadcast implementation exists. Provider evidence and confirmation freshness/reorganizations require independent production acceptance testing.
- Payment links are buyer-initiated; agents can operate outreach and monitoring automatically but cannot sign or spend organizational funds. Account control, spending approvals, policy scopes, tax treatment, refund rules, KYC/AML as applicable, donor consent and communication compliance remain separate.
- Cold calls and donor solicitation must use approved scripts and legitimate contact permissions. Do not falsely suggest legal government authority, recognition or tax benefits. A real transfer/donation is voluntary.
- Sales and Temple are separate campaigns, owners and income classifications. NEOpass identities authorize tasks, NeoMask isolates signing, NEO Counter remains the checkout facade, Counterpay supplies Bitcoin/Counterparty wallet connectivity, and verified transactions can later be attached to Crown Chain proofs.
- `counterpay.holytemples.org` DNS currently points to ChatGPT Sites. No deployment of this new branch to that protected Counterpay app has been verified.
- The list of boutique firms/foundations in Trello is **not retrieved**: Trello connection is required. After connection, import authorized cards into outreach without putting identifiable prospect data on-chain.

## Acceptance evidence and next gate
11 Node tests passed against the local implementation copy: payment amount and BIP21 semantics, donation mode, idempotency, address uniqueness, verified-binding rejection, failure without verifier, confirmation threshold, invalid evidence, expiry, clean public checkout, and satoshi precision. GitHub CI/build and real BTC/Counterparty integration have not been run for this branch.

Next: connect Trello, review and import opted-in/legitimate outreach leads; provision verified organization-owned XPUB-derived receive addresses with persistent allocation; bind approved campaign and offer records; render real checkout QR pages on a verified HTTPS staging host; perform independent Bitcoin receive and reconciliation tests with test-only funds before considering mainnet activation. No production changes, payments or outbound solicitation in this gate.
