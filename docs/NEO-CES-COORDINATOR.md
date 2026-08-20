# NEO-CES Coordinator Agent Framework v1.0

## Purpose

Integrate Community Exchange System (CES/CEN) exchange data into the NEO System through controlled, auditable coordinator agents without embedding coordinator passwords, session cookies, wallet secrets, or private keys in source code.

## Registered exchanges

- NMNI — World Open Market Exchange / Noocratic Open Market Nibiru Index
- NCES
- TSCU
- MOME
- XCPC
- BOND
- HEMP

NMNI baseline configuration: network CEN1098, server CES0001, mutual-credit exchange, symbol ∞, 0.09% levy, 33 ∞/hour reference conversion.

## Agent model

Each registered exchange receives a coordinator identity named `NEO-CES-<XID>`. Version 1 grants read scopes for exchange metadata, market listings, balances, activity, and transactions. Write capabilities exist in the permission model but remain disabled.

## Adapter strategy

Adapters are ordered by preference:

1. CES2
2. CEN Federation
3. Legacy CES

The CES2 and federation adapters are placeholders pending an official endpoint and authorized credentials. The legacy adapter currently provides health and registry metadata only. It deliberately does not automate a coordinator login or scrape authenticated pages.

If authorized browser automation is added later, it should run server-side in a dedicated worker, use secrets supplied by the deployment platform, honor CES terms and rate limits, and expose only normalized records back to the NEO application.

## Data classes

- PUBLIC — exchange metadata, public offers, public wants.
- AUTHORIZED — balances, activity, and transaction records retrieved under coordinator authorization.
- SENSITIVE — credentials, private keys, seed phrases, session cookies, and similar secrets. These are rejected from the normalized data pipeline.

## NOMNI data discipline

Raw CES observations and NEO-derived NOMNI metrics are separate objects. Derived metrics include explicit methodology and source-record types. Record counts do not, by themselves, establish fiat value, market capitalization, investment liquidity, or legal rights.

## Recommended production path

1. Obtain or confirm an authorized CES2 or CEN integration mechanism.
2. Store coordinator/API credentials only in server-side secret storage.
3. Implement a server-side connector or browser worker for authorized account data.
4. Normalize records through this module.
5. Persist audit events and source timestamps.
6. Publish approved aggregates to NEO Intelligence / NOMNI market data products.
7. Keep transaction and member-write scopes disabled until separately reviewed and approved.
