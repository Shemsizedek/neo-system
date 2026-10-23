# NEO Gate 122 — Community Clearing, Netting and Settlement

Gate 122 implements the Central Counterparty Community Trust as a contractual/community settlement engine.

## Functions

- trade capture and acceptance;
- position ledgering;
- bilateral and multilateral netting;
- initial/variation margin models;
- collateral haircuts and shortfall calculation;
- delivery-versus-payment and payment-versus-payment instruction models;
- Crown Chain evidence records;
- settlement/finality state.

## Finality

NEO distinguishes instruction, execution evidence, and finality:

`instruction != settlement receipt != finality attestation`.

An instruction becomes final only when verified settlement evidence and a verified finality attestation are present.

## Regulatory boundary

This is a community contractual clearing architecture. It must not be represented as DTC, DTCC, an SEC-registered clearing agency, broker-dealer, exchange, bank, or government authority unless that external status is separately and independently verified.

External Bitcoin/Counterparty, bank, broker, custodian, or securities settlement execution requires an adapter and its own legal/technical authorization.
