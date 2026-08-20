# Noogle / Omnitrix — ORIGIN v1

## Purpose

Noogle is the NEO knowledge engine. Omnitrix is its browser and command surface. The product is designed around provenance, Noology, Indigenous ontology, historical context, nature, and transparent evidence classification.

## Product principles

1. **Provenance over popularity.** Ranking should expose who said something, when, where, and on what evidence.
2. **Indigenous ontology first for Indigenous subjects.** Community terminology and living authority should be represented directly rather than automatically subordinated to external naming systems.
3. **Evidence and interpretation are separate.** Results should distinguish FACT, DOCUMENTED, COMMUNITY KNOWLEDGE, TRADITION, INTERPRETATION, HYPOTHESIS, DISPUTED, UNVERIFIED, and SPECULATION.
4. **Open contribution with transparent curation.** Contribution does not automatically equal authority.
5. **Security before financial convenience.** No wallet or miner adapter may request or expose seed phrases, private keys, or passwords.

## Search modes

- STANDARD
- NOOLOGICAL
- INDIGENOUS
- HISTORICAL
- NATURE
- SCHOLARLY
- FACTOLOGY
- GEOGRAPHIC
- BITCOIN
- COUNTERPARTY
- DEEP SEARCH

Deep Search means broader lawful discovery across archives, repositories, public datasets, specialist indexes, and hard-to-find sources. It does not imply illegal access.

## Omnitrix shell

The prototype uses four primary surfaces:

- **Browser bar** — query/address entry and Omnitrix command access.
- **Noogle workspace** — search-mode selection and provenance-oriented results.
- **Knowledge rail** — entity/claim status, evidence, and provenance metadata.
- **NEO systems rail** — Bitcoin/XCP wallet readiness and NEO Miner control status.

## Target architecture

```text
Noogle UI
  -> Search API
      -> Indexer
      -> Knowledge Graph
      -> Provenance Engine
      -> Ontology Registry

Omnitrix
  -> Noogle Search
  -> Browser Adapter
  -> Bitcoin Adapter
  -> Counterparty Adapter
  -> NEO Wallet
  -> NEO Miner Adapter
  -> NEOsync Command Layer
```

## Bitcoin / Counterparty design

The browser should be Bitcoin-native and Counterparty-aware, but financial execution must remain adapter-based.

Read-only first:

- address inspection
- transaction inspection
- asset metadata
- supply/divisibility/issuer information
- Counterparty transaction decoding
- market and provenance displays

Write operations later:

- PSBT construction/signing
- XCP transfer composition
- asset issuance flows
- wallet connectivity

Every irreversible action must show network, asset, amount, destination, fees, and risk before requiring explicit user confirmation.

## NEO Miner design

Omnitrix is the control plane, not the mining engine. A miner adapter should expose normalized telemetry:

```json
{
  "status": "online",
  "hashrate": 0,
  "temperature_c": null,
  "power_w": null,
  "pool": null,
  "worker": null,
  "accepted_shares": null,
  "rejected_shares": null,
  "estimated_btc": null,
  "actual_btc": null
}
```

No profitability claim should be made without current hashrate, power consumption, electricity cost, pool fees, network difficulty, and BTC price.

## Next implementation milestones

### Phase 1 — Prototype
- static Noogle/Omnitrix interface
- search modes
- knowledge-card UI
- BTC/XCP read-only placeholders
- NEO Miner read-only placeholder

### Phase 2 — Search service
- Noogle search API
- provenance schema
- ontology registry
- knowledge graph
- source confidence model

### Phase 3 — Bitcoin/XCP
- read-only Bitcoin RPC/API adapter
- Counterparty API adapter
- asset/transaction explorer
- wallet connection boundary

### Phase 4 — Miner integration
- miner telemetry adapter
- pool statistics
- alerts
- payout reporting

### Phase 5 — Browser runtime
- package Omnitrix as a real browser shell or extension-compatible runtime
- connect NEOsync command intelligence
- permissions, signing, and security review
