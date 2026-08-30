# NEO Market Identity Standard

Status: Proposed Core Standard  
Version: 1.0.0

## Canonical market principal

NEO Exchange, NEOfx, and NEO DEX reserve Account #1 for `neo:founder:000001` with role `founder_owner`.

## Ownership is not trading authority

The reserved founder identity establishes canonical ownership precedence only. It does not grant automatic order signing, custody, settlement, listing approval, pricing override, or market-administration authority.

## Required controls

Trading actions require an authenticated session, verified enrollment, applicable trading permission, and explicit signing authority. Market-administration actions require authenticated authorization and step-up approval where appropriate. Custody and settlement services must independently enforce their own authorization and key-management policies.

## Key handling

Private wallet keys, signing keys, recovery material, seed phrases, and exchange custody secrets must never be stored in the public identity registry. Public identifiers and public-key fingerprints may be referenced for verification.

## Product mappings

- `neo-exchange` — primary professional trading terminal and market interface.
- `neofx` — FX/world-currency market surface.
- `neo-dex` — decentralized Counterparty/XCP-oriented market surface.

All three map Account #1 to the same canonical subject rather than creating product-specific founder identities.

## Audit invariants

- Account #1 cannot be reassigned or recycled.
- Founder status cannot bypass authentication or signing requirements.
- Market-admin functions remain separately permissioned.
- Listing, pricing, custody, settlement, and order execution decisions remain auditable.
