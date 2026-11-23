# Project 144 — Bitcoin / Counterparty product-surface contract

## Release boundary
The NEO Explorer is a Bitcoin + Counterparty read-only application. Keep its default page limited to:
- Counterparty asset-name lookup and returned on-chain metadata
- Direct, attributed open-order quotes for the asset/XCP pair, or an explicit no-quote state
- Counterparty Bitcoin mainnet synchronization status
- Optional advanced Bitcoin testnet diagnostics, clearly segregated from mainnet assets

Never display invented bids/asks, other blockchain networks, CES accounting, institutional rankings, off-chain evidence scores, or unrelated cross-product funnels on this surface.

## Shared service interface, proposed (not yet wired)
- **NEO Crown Chain:** use Bitcoin transaction IDs and Counterparty asset issuance/ownership reads as *evidence*. Do not imply underlying legal title from token balances.
- **NEO FX:** use separately timestamped XCP / BTC quotes, with provenance and expiry. Never infer executable liquidity or fiat conversion without supported quotes.
- **NEO Scan:** consume verified Bitcoin mainnet heights, asset metadata, transaction lookups, and issuer records with source labels.
- **NEO Pay / Counterpay:** share deterministic address/asset matching and confirmation policy; enforce independent quote validation and transaction finality before crediting a payment. No wallet signing or broadcast enabled here.
- **NeoMask:** separate signing approval and network selection from public Explorer reads.

## Acceptance and follow-up
- Mobile-first display and a single asset search; keyboard-focus-visible controls; no fake/demo price rows.
- On any API failure, use loading, unknown, or unavailable—not false green “live” states.
- Do not feed XChain TBTC into mainnet accounting or settlement.
- Next integration workstream: server-side Counterparty normalization/cache with rate limits and origin-safe read access, paired with verified Bitcoin Core RPC evidence. Treat this as a proposal, not an active deployment.
- Deploy to **NEO SYSTEM** workspace only after successful CI, run public read-only smoke checks, verify Render's deploy commit, and keep a rollback commit.
