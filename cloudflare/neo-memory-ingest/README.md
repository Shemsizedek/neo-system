# NEOsync Memory Ingestion

Automatic context-linking service for NEOsync Operational Memory.

## What it ingests

- Executive Inbox attention items and Enterprise approvals surfaced there.
- Government Module Adapter state.
- Executive Command Board tasks.
- Canonical NEO System and NEO Hub entrypoints.

The service writes directly to the `neo-memory-graph` Durable Object through an external Durable Object binding. This avoids exposing the private memory API publicly for scheduled ingestion.

## Official entrypoints

- NEO System: `https://neo.holytemples.org`
- NEO Hub: `https://hub.holytemples.org`

These hosts already belong to the NEO edge/load-balancer host set. `architecture/neo-official-entrypoints.json` is the canonical relationship registry for their roles.

## Configuration

Recommended secrets/variables:

- `MODULE_ADAPTER_TOKEN`
- `CF_ACCESS_CLIENT_ID`
- `CF_ACCESS_CLIENT_SECRET`
- `EXECUTIVE_INBOX_URL`
- `GOVERNMENT_API_URL`
- `NEOSYNC_COMMAND_BOARD_URL`

`POST /sync` performs an on-demand sync. A 15-minute cron performs the same ingestion automatically.

## Boundary

Operational-memory ingestion does not sign wallets, transfer funds, execute terminals, bypass source permissions, perform enforcement, or determine external legal effect. Source-system authority remains with each source module.
