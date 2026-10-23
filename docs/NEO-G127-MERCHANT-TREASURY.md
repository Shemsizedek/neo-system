# Gate 127 — NEO Counter Merchant Acquiring & Settlement Treasury

Gate 127 governs post-sale merchant funds after Gate 126 payment finality.

Flow:

verified final payment -> merchant balance -> fee/reserve accounting -> settlement batch -> payout approval -> NeoMask/external signer -> broadcast -> confirmation -> reconciliation.

Refunds require evidence of the original final payment. Disputes may create reserves that reduce available merchant balance. The service never stores wallet private keys.

Automatic asset conversion is disabled unless separately authorized with a verified pricing source and execution adapter. External acquiring, banking, tax, custodial, venue or jurisdictional requirements apply at the relevant interface.
