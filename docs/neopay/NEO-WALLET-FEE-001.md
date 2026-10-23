# NEO-WALLET-FEE-001 — Transfer fee foundation

## Decision

Stage a 9 basis point (0.09%) outgoing transfer service levy, separate from the
Bitcoin miner fee. This gate implements a shared BTC quote calculator and tests;
it does not activate collection, change transaction bytes, or deploy a wallet.
No Counterpay-specific implementation was located in this repository during
this gate. Counterpay integration remains to be identified and verified.

## Pricing

- Recipient receives the entered principal; sender pays the levy on top.
- Service fee = floor(principal in sats × 9 / 10,000), limited by an explicit cap.
- A fee below the configured treasury script dust threshold is waived, without
  increasing the miner fee. No minimum service charge.
- Network fee is independent and must reflect all eventual outputs.
- Viewing, connecting and receiving do not trigger this outgoing quote API.
- 0.9% swaps/merchant pricing remains a proposal, not an enabled fee schedule.
- Test cap amounts are examples only, not approved production prices.

## Remaining integration

1. Set the cap in sats and verify ownership of the fee treasury address.
2. Add exactly one treasury output to BTC construction; recalculate input
   selection, network cost, change and maximum-spend behavior. Do not fund the
   service charge by subtracting it from the recipient or miner payment.
3. Show recipient amount, NEO service fee, network fee, total debit and treasury
   address before signing. Bind all fields and outputs to the reviewed intent.
4. Verify raw and PSBT signing preserves the complete approved output set.
   Replacement transactions must preserve one levy, without duplicate collection.
5. Integrate both wallet entry points using a single fee owner per payment.
   Receipts distinguish submitted, confirmed, replaced and failed transactions;
   a quote or failed broadcast is not earned revenue.
6. Test insufficient balances, dust, capped fees, fee bumps and output tampering
   using fixtures/regtest before a separate production activation decision.

Counterparty tokens are outside this BTC-only calculator. Do not apply BTC sats
to token quantities or infer prices for illiquid assets. Indivisible assets and
token fee payment need an explicit settlement design and supported protocol
composition tests before enabling collection.

## Validation

Run `node --test tests/neopay/serviceFee.test.mjs` on Node 24. Tests cover rate,
separate miner costs, cap, rounding, dust waiver, invalid inputs, supply bounds
and inactive collection. These are arithmetic tests, not end-to-end wallet tests.
