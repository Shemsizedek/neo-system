# NEO-MG-003 — Mobile fleet pilot (candidate)

This change advances the phone-based control **foundation**, not direct SHA-256 mining on a handset.

## What is implemented

- `/#/miner-mobile`: responsive, authenticated, read-only fleet status view. Uses the existing `OperatorSessionPanel` and `operatorFetch`, so no production API token is placed in the browser.
- `GET /fleet/mobile`: operator-session-protected, allowlisted fleet projection. Redacts public keys, serials, private telemetry credentials and unverified hashrate.
- Persistent `miner_device` state in the existing SQLite store: enrollment, last signed timestamp (replay guard), signed device consent, telemetry and revocation are stored with audit events.
- `POST /fleet/:id/consent`: accepts an Ed25519-signed statement from the enrolled device private key with exact scope `FLEET_TELEMETRY_AND_HASHPOWER_REPORTING_V1`; verifies signature and freshness.
- `POST /fleet/:id/revoke`: operator-authorized, CSRF-protected (through BFF), requires a reason. Revocation permanently invalidates that enrollment's telemetry and capacity eligibility.
- Capacity is **zero** unless all required gates pass: physical hardware attestation, explicit signed device opt-in, fresh signed operational ASIC telemetry, pool connectivity and safe temperature.

## Trust limits

A signature verifies **control of the enrolled private key**, not legal ownership of a phone or ASIC. A real owner identity/authorization check and physical attestation procedure remain separate deployment blockers.

Revocation turns off NEO acceptance/allocation for the device; it **does not power off external hardware or disconnect a third-party mining pool**. Physical stop and emergency thermal protection remain local.

The currently deployed system is not presumed operational. It does not connect the phone CPU to Bitcoin hashing. This release makes no profitability, hashrate, block-discovery or payout claim.

## Operator gateway

- `GET /fleet/mobile`: `VIEW_OPERATIONS` session permission
- `POST /fleet/:id/consent`: `MANAGE_FLEET` session permission and CSRF
- `POST /fleet/:id/revoke`: `MANAGE_FLEET` session permission and CSRF

Use only the existing private Miner BFF. Never publish the internal Miner API or set `VITE_` secrets. Session secrets and credentials belong in the runtime secret manager.

## Verification

Run:

```sh
npm run miner:agent:test
npm run miner:production:test
npm run miner:generator:test
npm run build
```

Acceptance also requires operator BFF login from an authorized mobile origin, evidence-backed device owner authorization, real ASIC discovery, temperature and power validation, signed sample telemetry and verified pool-share receipt. Nothing deploys automatically from this draft branch.

## Next hardware pilot

1. Privately deploy the approved Miner Agent/Controller stack with an authorized physical SHA-256 ASIC, configured for local safety limits and correct mining pool.
2. Record legal device-owner permission and physical attestation under an audited administrative workflow before any capacity is counted.
3. From a phone on the authorized operator site, sign in, observe telemetry, and revoke access. Verify the persisted revocation survives process restart and prevents new accepted telemetry.
4. Confirm Bitcoin mining via pool-accepted shares and actual payout records. Keep separate measurement of power costs and heat.
