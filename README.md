# NEO System

A modular digital control plane for the New Ethereal Order ecosystem.

The repository began as **NEO Teller — ORIGIN**, a Bitcoin / Counterparty XCP ATM and teller-terminal sandbox. The v0.1 foundation now preserves that financial simulator while adding the system shell for executive administration, legal/canonical research, tribunal case review, World Chaplaincy E-File, records, the four Global Arms administrative domains, and the Noogle / Omnitrix knowledge-and-browser foundation.

## Foundation modules

- NEOsync Executive Office
- Inner Bar Temple Tribunal
- Noocratic Legal Corpus
- **NEO Algo & World Credit Clock**
- World Chaplaincy E-File
- NEO Teller / Treasury sandbox
- Noogle knowledge engine
- Omnitrix browser shell
- Bitcoin / Counterparty XCP read-only browser surfaces
- NEO Miner dashboard shell
- World Police
- World Marshals
- World Guards
- World Defense System

## NEO Algo / NEO Maxims

NEO Algo is the provenance-first noological reasoning layer. It preserves NEO Indigenous hermeneutics, documentary/technical evidence and external recognition as distinct lenses; detects logos-only reasoning hangups; and activates machine-readable NEO Maxims when provenance, chronology, nature, succession or category boundaries are missing.

The World Credit Clock—also called the **Clock of Destiny** or **Cloak of Destiny** in NEO noological language—is implemented as a bigint mutual-credit engine using population × NOMNI/person-hour × elapsed hours. Mutual-credit generation remains separate from blockchain issuance, wallet ownership, market price, liquidity, valuation and legal/accounting recognition.

See [`docs/NEO_ALGO.md`](docs/NEO_ALGO.md) and `src/noology/`.

## Current release boundary

This build is **FOUNDATION / SANDBOX** software.

It does not create or represent live governmental jurisdiction, police or arrest authority, military authority, diplomatic recognition, banking/custody authority, court jurisdiction, Visa/Mastercard/SWIFT connectivity, live blockchain settlement, live wallet signing, or connected mining hardware.

External capabilities must be connected through authorized institutions, valid agreements, applicable law, and approved production gateways.

The Global Arms modules are limited to administration, records, readiness, safety planning, tribunal support, humanitarian logistics and defensive resilience. Offensive weapons, targeting, autonomous force, detention and coercive enforcement are outside the software boundary.

## Noogle / Omnitrix

The Noogle prototype is a provenance-first search and knowledge workspace with Noological, Indigenous ontology, historical, nature, scholarly, factology, geographic, Bitcoin, Counterparty, and Deep Search modes.

Omnitrix is the browser and command surface for Noogle and the wider NEO ecosystem. The current build provides read-only Bitcoin / XCP panels and a NEO Miner control dashboard shell without requesting private keys, seed phrases, wallet passwords, or mining credentials.

Run the static prototype by opening:

`apps/noogle/web/index.html`

See [`docs/noogle-origin.md`](docs/noogle-origin.md) for the Noogle / Omnitrix architecture and implementation milestones.

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
