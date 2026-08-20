# NEO Virtual Satellite Network (NVSN) — ORIGIN v0.1

## Purpose
NVSN is the NEO ecosystem's software-defined communications fabric. It coordinates heterogeneous, authorized communications transports while keeping financial settlement separate from communications payloads.

## Design rule
**NVSN connects. NEO Wire communicates. Bitcoin settles. Counterparty tokenizes. World Currency denominates. NEOsync coordinates.**

## v0.1 implemented primitives
- NVSN node and capability model
- Node registry
- Transport-aware route scoring
- Multi-hop route planning
- NEO Telegram envelope
- Deterministic prototype integrity fingerprint
- Store-forward-ready TTL field
- Delivery simulator with demo topology
- Explicit Bitcoin/Lightning/Counterparty settlement instruction type

## Safety / production boundary
The v0.1 package does not control transmitters, access satellite hardware, transmit on RF frequencies, custody assets, broadcast Bitcoin transactions, or connect to public telephone networks. Hardware and regulated network integrations must be added through authorized adapters.

## Next milestones
1. Replace demo fingerprint with WebCrypto Ed25519 signatures.
2. Add encrypted payload envelopes and replay protection.
3. Add route policies for message class, bandwidth, priority, and cost.
4. Add persistence for queued store-and-forward Telegrams.
5. Add NEO Wire adapter interfaces.
6. Add read-only SatNOGS/open-ground-station observation adapter research prototype.
7. Add Bitcoin/Lightning/Counterparty settlement adapters in simulation mode first.