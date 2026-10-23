# NEO Investment Card Engine — Crown integration gate

Version: NEO-INVESTMENT-CARD-ENGINE-1.0.0.

The user's CARDMASTER specification is implemented as a backend module. The named saved ChatGPT skill was not exposed to this session; this release does not claim that skill was installed or invoked.

## API

GET https://crown.holytemples.org/assets/{ASSET}/investment-card.json returns {payload, integrity}. GET https://crown.holytemples.org/assets/investment-card.schema.json exposes its JSON Schema. Existing showcase.json exports now include investment_card_url. This release does not change TokenScan metadata files, on-chain descriptions, or wallets.

## Identity and classification

Card IDs use the full SHA-256 of Counterparty mainnet plus the canonical token name. Deal IDs and card numbers remain absent until provided. Financial instrument type and collectible presentation are separate. Supported types include real estate, business acquisition, private equity, venture capital, private capital, shares/stocks, bonds, notes, pools, portfolios, indices, NEO projects, insurance policies, insurance claims, currency, utility and explicitly declared collectibles. Numeric names alone establish none of these types. Token-name suffixes are provisional. A picture alone never proves NFT uniqueness. Classifications are rule-based declarations and patterns, not legal or underwriting determinations.

## Financial integrity

Every supplied figure is REQUIRES VERIFICATION; absent figures are NOT PROVIDED. A field named projected_roi_derived does not prove a calculation. Only the implemented net_operating_income / acquisition_value * 100 formula produces DERIVED; its source inputs remain unverified. Exact decimal strings are retained. Units/currency are never invented. No score is generated without a supplied methodology: /SCORE returns the provided score and evidence status. Supplied rarity is cosmetic and cannot raise a financial rating. Supplied hash labels are not transaction evidence. MOCK sources remain MOCK / UNVERIFIED even if the input claims VERIFIED.

## Commands

Module export runCardCommand supports /CARD, /BATCH, /REAL-ESTATE, /BUSINESS, /PRIVATE-CAPITAL, /PORTFOLIO, /TOKENIZED, /SCORE, /AUDIT, /PROMPT, /UPDATE and /VERIFY. These are programmatic commands, not newly registered ChatGPT tools. /UPDATE constructs a new export from supplied resolved data; it does not persist or modify a ledger. /VERIFY accepts a supplied {record} and detects canonical payload hash changes. It does not attest investment backing, financial figures or on-chain anchoring.

## Integration boundaries

NEOsync, Deal Agent and Deal Desk can consume the API, but this gate does not claim their consumers are already connected. Card rendering remains a prompt plus the existing Crown card renderer. No new artwork is automatically minted. Public exports must not include private policyholder, claimant or medical data; this module exports only public classification, display metrics and public media links.
