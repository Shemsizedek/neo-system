# NEO System

The NEO System is a modular digital infrastructure ecosystem. This repository begins with the Noogle knowledge engine and the Omnitrix browser shell.

## Active foundation

- **Noogle** — search and knowledge discovery with provenance, Noology, Indigenous ontology, history, nature, and factology modes.
- **Omnitrix** — browser command shell and NEO gateway.
- **Bitcoin / Counterparty XCP** — native-ready interface layer; transaction execution is intentionally not enabled in this prototype.
- **NEO Miner** — monitoring/control dashboard shell; hardware integration is intentionally not enabled in this prototype.

## Run the prototype

Open `apps/noogle/web/index.html` in a modern browser.

## Repository structure

```text
apps/noogle/web/              Noogle + Omnitrix static prototype
docs/noogle-origin.md         Product and architecture specification
packages/                     Shared protocol packages (next phase)
services/                     Search, knowledge graph, and miner services (next phase)
```

## Security posture

The first prototype is read-only. It does not request private keys, seed phrases, wallet passwords, or mining credentials. Financial and miner actions will require explicit adapters and user confirmation before they are enabled.
