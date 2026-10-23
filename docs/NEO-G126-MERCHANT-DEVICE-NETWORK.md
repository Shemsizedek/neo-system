# Gate 126 — NEO Counter + ETHA Universal Merchant & Device Network

Gate 126 unifies NEO Counter merchant operations with ETHA cards, terminals, security devices and vault-capable hardware.

## Payment path

Customer NeoMask -> Guardian review -> terminal/device payment intent -> user-controlled signature -> Gate 122 clearing/settlement -> Gate 123 registry update -> asset-aware receipt.

## Merchant/device model

Merchants maintain scoped roles and authenticated terminals. Devices may include NEO Counter terminals, ETHA Cards, ETHA Terminals, ETHA Devices, physical vaults and compatible bank-vault security devices.

Devices carry identity and capability references only. Terminals and servers do not store wallet private keys.

## Settlement

A merchant payment is not final merely because a signature exists. Finality requires Gate 122 verified settlement evidence. Counterparty/XCP/NOMNI payments also require the corresponding Gate 123 ownership/register update before the merchant receipt is final.

## External interfaces

NEO records its internal governance under its Natural Law/self-regulated community doctrine. External acquirer, banking, tax, merchant-network, venue, custodial, jurisdictional or regulated-counterparty requirements apply at the relevant external interface.
