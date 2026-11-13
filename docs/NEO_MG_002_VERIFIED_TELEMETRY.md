# NEO-MG-002 — Verified Miner-to-Generator Telemetry Integration

Status: **code candidate only**. No physical fleet, phone hash contribution, settlement, or production deployment is implied by this document.

## Goal and trust boundary

The ultimate product will let a user manage Bitcoin mining from a phone and opt authorized devices into a fleet. A mobile dashboard does **not** mean a mobile phone is producing Bitcoin shares. Native phone CPU hashing would be a separate, explicitly opted-in experimental capability; it is unlikely to be economically competitive with SHA-256 ASICs.

Current flow:

1. NEO Miner Controller reads telemetry from a configured ASIC adapter.
2. NEO Miner Agent signs each complete telemetry envelope (including nested values) with an enrolled Ed25519 device key; `NEO_MINER_AGENT_GATEWAY_TOKEN` is an optional distinct server-side bearer token for authenticated HTTPS posting.
3. NEO Miner production API `POST /fleet/:id/telemetry` accepts authenticated signed events and rejects invalid signatures, mismatched miner IDs, duplicates, stale/future readings, simulated events, and inactive pool reports.
4. Legacy unsigned telemetry remains visible to operators but is **ineligible** for verified allocation.
5. Private `GET /fleet/capacity` counts ONLY devices meeting all gates: enrolled key, fresh signed reading, verified physical hardware, connected pool, safe reported temperature, positive hashrate and power.
6. Loopback-only telemetry sidecar exposes authenticated read-only `GET /capacity` via double allowlist. No wallet, addresses, signing keys, or per-miner details are forwarded.
7. Generator fetches `/capacity` with a dedicated 64-hex bearer token, enforces HTTPS, exact path, bounded reserve percentage and <=60-second feed age, and returns verified fleet capacity without enabling purchases or contract activation.
8. Miner production contract reservation and activation are constrained by verified, fresh fleet capacity. The old environment-only `VERIFIED_MINER_AGENTS` value no longer satisfies production miner readiness.

## Configuration and deployment

**On the Miner Agent:** set `gatewayUrl` to an authorized HTTPS Miner production telemetry endpoint and provision `NEO_MINER_AGENT_GATEWAY_TOKEN` through protected local service configuration, not the phone or a source-controlled JSON file. The Miner Agent signing-key material stays on its device.

**On the loopback sidecar:** configure `NEO_MINER_API_TOKEN` (internal), `NEO_MINER_TELEMETRY_TOKEN` (dedicated 64-hex public bridge token), and optionally `NEO_MINER_INTERNAL_CAPACITY_URL` (defaults to `http://127.0.0.1:8890/fleet/capacity`). Only expose the sidecar behind HTTPS and authentication. Never publish the Miner production API, RPC credentials or fleet enrollment interface.

**On the Generator:** set `NEO_GENERATOR_CAPACITY_URL=https://<approved-sidecar-host>/capacity` and `NEO_GENERATOR_CAPACITY_TOKEN` to the dedicated upstream telemetry token. The optional `NEO_GENERATOR_RESERVE_PCT` defaults to 7, and invalid values fail closed. Mount secrets from a secret manager; do not embed them in frontend bundles.

## Important blockers

- Hardware enrollment currently starts with `hardwareVerified:false`. A trusted physical attestation/evidence procedure is a **separate gate**. There is intentionally no public API for self-asserting physical hardware verification; therefore the current fleet will report zero eligible production capacity until the attestation workflow is implemented.
- Miner fleet enrollment/telemetry records currently reside in process memory. Durable enrollment, replay protection across restarts, and revocation must precede production use.
- The signed envelope canonicalization was corrected to include nested fields. Older deployed agents using the previous signature format must be upgraded in coordination with the backend before enabling this path.
- Observed hashrate is not independently confirmed mining revenue or a pool payout. Pool share receipts and separately approved financial/compliance checks remain required.
- Android and iOS mining/distribution rules, power consumption, temperature safeguards and explicit device-owner consent need platform-specific review before native mobile hashing is offered.

## Regression checks

```sh
npm run miner:agent:test
npm run miner:production:test
npm run miner:telemetry:test
npm run miner:generator:test
```

Acceptance requires test runs on the same commit, review of device key trust, evidence-backed physical verification, and staged endpoint smoke tests. The presence of an HTTPS URL or passing `/health` does not prove live hashing.
