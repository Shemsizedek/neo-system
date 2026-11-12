# Project 144 — Trello to Counterpay approval bridge

## Source inventory verified on 2026-11-11
Connected Trello workspace: Shelton Estate & Co.
- NEO Family Office Pipeline: https://trello.com/b/IajUVo2x/neo-family-office-pipeline
  - Lists: New Intake, Qualification, Due Diligence, Matched Opportunities, Active Process, Closing.
  - Only one open protocol card was present in New Intake; there were no open individual deal cards in qualified/closing stages.
- Office Management: https://trello.com/b/MhHUFRTQ/office-management
  - Contains Office Rolodex (Company Contacts, Office Contact List), Marketing Overview (Pending Leads, Sales Campaigns), and Investors Buy Box.
  - Company Contacts includes real named people and contact details, which must remain private and do not by themselves establish lawful or consented fundraising outreach.
- Search of accessible boards and cards for "Boutique" and "Foundation" returned no matches. Other workspaces or archived records may exist outside the bounded search.

## Implemented bridge
`server/neo-merchant-network/trello-counterpay-bridge.mjs` builds on PR #1411's inbound BTC payment request engine. It is a library-only function, not a webhook, worker, Trello writer, or production API.
- Accepts a trusted Trello card snapshot and projects **only** opaque card identity and stage. Never sends contact names, emails, phone numbers, card descriptions, comments or attachments into Bitcoin request services.
- Accepts card identities only from the NEO Family Office Pipeline and stages `05 - Active Process` or `06 - Closing`. Sales payment requests require Closing.
- A server-only `resolveApproval` must return a matching explicit approval reference, enabled organization receiving address binding, voluntary donation or documented commercial sale purpose, confirmed consent, cleared legal review, and current authorization with at least 1 hour remaining. The bridge does **not** trust card text to supply approval.
- Derives pseudonymous references using server-only keyed HMAC; the secret is never sent to Trello or inserted into public checkouts. Reuses the existing payment service's idempotency and address-reservation rules.
- Produces an internal-only pending inbound payment request; it cannot sign, broadcast, move funds, create wallets, issue assets, or send outreach.

## Operating sequence
1. Read official Trello board and classify source cards without modifying originals.
2. Qualify legitimate contacts and verify facts, consent, authority, and purpose. Investment/securities leads stay in a separate human/compliance workflow; don't attach donation or retail sales checkout unless independently appropriate.
3. Trusted admin creates explicit payment authorization for an organization-controlled receiving address and campaign/order.
4. Bridge prepares an internal Counterpay BTC payment request with a BIP21 URI. Agents may present it during a legitimate opt-in conversation only after deployment and recipient approval.
5. Independently verify Bitcoin chain inclusion and exact output, apply confirmations and reconcile to NEO Books. A QR code, txid pasted by a caller, or wallet display is never proof of settlement.
6. Maintain private audit records, expiry, address reuse prevention, refunds policy and revocation.

## Blockers
- No eligible active/closing Trello deals yet, and no verified recipient consent/approval records.
- No independently verified real NEO organizational BTC receiving wallet or durable address allocation registry.
- The PR #1411 payment engine is in-memory, separate from the actual Counterpay Sites deployment; no live payment verifier or persistent invoice worker is connected.
- Actual Counterpay domain DNS points to ChatGPT Sites; protected source/runtime integration remains unverified.
- No live agent outreach, voice calls, email, donor requests, public checkout, signing, payment, token issuance, or Trello writes occurred.

## Validation & rollback
Source includes `node --test server/neo-merchant-network/trello-counterpay-bridge.test.mjs` with synthetic fixtures for rejection of unverified or unsolicited recipients, approved donations, fixed-price sales, idempotency, and protection of private contact fields. Tests committed to GitHub; current remote CI status must be checked. Do not claim runtime integration, live BTC payments or Trello automation are operational.

This is stacked on PR #1411 and should not merge into main before #1411 is reviewed and merged. Rollback by leaving this branch unmerged.
