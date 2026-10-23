# Gate 128 — NEO Multi-Asset Conversion & Merchant Liquidity Engine

Gate 128 allows a merchant to accept one Bitcoin/Counterparty asset while settling treasury balances in another asset.

Flow:

received asset -> fresh explicit reference quotes -> eligible authorized liquidity route -> merchant approval -> execution adapter -> settlement evidence -> converted merchant balance.

Prices are never inferred from balances, transaction counts, activity volume, exchange-conversion labels, or market-cap claims. Reference pricing may use the existing CES methodology of the median of fresh explicit positive source observations.

## Market-integrity firewall

Self-trading and wash trading are prohibited. The engine rejects routes where buyer and seller are the same economic actor and does not count self-generated activity as liquidity or pricing evidence.

Spread and slippage limits must be satisfied before a route is eligible. Actual execution slippage is checked again before settlement is recorded.

## Merchant preferences

A merchant may hold the received asset or request settlement into BTC, XCP, NOMNI, or an explicitly named Counterparty asset.

Automatic conversion remains disabled unless the merchant has authorized conversion and an executable approved route exists.
