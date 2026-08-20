# NEO Teller — ORIGIN

Bitcoin / Counterparty XCP ATM, teller-terminal and ETHA network control plane for the NEO financial ecosystem.

## Current release

This repository contains a functional sandbox dashboard and transaction simulator plus Base44-compatible entity schemas for ATM machines, ETHA transactions, cards, assets, settlement, compliance, fraud and double-entry ledger entries.

### Safety boundary

The current build is **SANDBOX ONLY**. It does not claim or simulate live Visa, Mastercard, SWIFT, banking, custody, FX, or blockchain connectivity. External networks must be connected through approved gateways and regulated counterparties before production use.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Architecture

`Cash / Card / Bank → NEO Teller → ETHA → Bitcoin / Counterparty XCP`

`Bitcoin / XCP / Counterparty Assets → ETHA → NEO Teller → Cash / Card / Merchant`

The Base44 project descriptors live under `base44/` and are intended to be linked to a Base44 app when an app slot is available.
