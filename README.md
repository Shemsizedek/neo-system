# NEO System

A modular digital control plane for the New Ethereal Order ecosystem.

The repository began as **NEO Teller — ORIGIN**, a Bitcoin / Counterparty XCP ATM and teller-terminal sandbox. The v0.1 foundation now preserves that financial simulator while adding the system shell for executive administration, legal/canonical research, tribunal case review, World Chaplaincy E-File, records, and the four Global Arms administrative domains.

## Foundation modules

- NEOsync Executive Office
- Inner Bar Temple Tribunal
- Noocratic Legal Corpus
- World Chaplaincy E-File
- NEO Teller / Treasury sandbox
- World Police
- World Marshals
- World Guards
- World Defense System

## Current release boundary

This build is **FOUNDATION / SANDBOX** software.

It does not create or represent live governmental jurisdiction, police or arrest authority, military authority, diplomatic recognition, banking/custody authority, court jurisdiction, Visa/Mastercard/SWIFT connectivity, or live blockchain settlement.

External capabilities must be connected through authorized institutions, valid agreements, applicable law, and approved production gateways.

The Global Arms modules are limited to administration, records, readiness, safety planning, tribunal support, humanitarian logistics and defensive resilience. Offensive weapons, targeting, autonomous force, detention and coercive enforcement are outside the software boundary.

## Historical-record policy

Historical bulletins, letter patents, canons, resolutions and original drafts are treated as immutable source records. Later interpretation or development is stored as a separate addendum, authority note or superseding instrument; historical text is not silently rewritten.

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

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Original finance route:

`Cash / Card / Bank → NEO Teller → ETHA → Bitcoin / Counterparty XCP`

`Bitcoin / XCP / Counterparty Assets → ETHA → NEO Teller → Cash / Card / Merchant`

The Base44 project descriptors remain under `base44/` for later application integration.
