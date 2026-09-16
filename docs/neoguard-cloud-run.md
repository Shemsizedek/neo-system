# NEO Guardian Cloud Control Plane

Canonical production hostname: `neoguard.holytemples.org`

Target runtime: Google Cloud Run, `us-central1`.

## Boundary

Cloud Run is the NEO Guardian / Endpoint cloud control plane. It is not an ADB pairing host and MUST NOT receive Android six-digit pairing codes or ADB private keys. Android pairing remains local/private-network-side.

## API foundation

- `GET /healthz`
- `POST /v1/enroll` — bootstrap-authorized enrollment; records endpoint ID and host public-key fingerprint only.
- `POST /v1/heartbeat` — authenticated device liveness.
- `POST /v1/posture` — authenticated defensive posture observations.
- `POST /v1/events` — authenticated `neo.hacker.endpoint-event.v1` ingestion.

Posture is classified as observation rather than proof of compromise. Event ingestion grants no tool authority and performs no consequential action.

## Required production configuration

- Store `NEOGUARD_ENROLLMENT_TOKEN` in Google Secret Manager and inject it into Cloud Run. Never commit it.
- Deploy the container from `server/neoguard-control-plane/Dockerfile`.
- Use HTTPS only.
- Map `neoguard.holytemples.org` to the deployed service only after authoritative DNS/hosting is verified so existing Holy Temples services are not disrupted.
- Prefer Cloud Run service identity / IAM and a durable datastore for production device records. The current in-memory registry is a foundation and is not durable across Cloud Run instance replacement.
- Add rate limiting, nonce/replay protection, key rotation, persistent encrypted device registry, and auditable authorization before enabling consequential remote operations.

## Device path

`Guardian / NEO Endpoint -> authenticated HTTPS -> neoguard.holytemples.org -> Cloud Run -> NEO Hacker / NEOsync / NOUS / Router -> analysis and audit`

ADB remains outside this cloud path. Never expose Android Wireless Debugging to the public Internet.
