# Neogram NVSN Relay Reference v0.5

Neogram is the public messaging product. NTP (NEO Telegram Protocol) remains the underlying message protocol, and NVSN remains the network/transport layer.

## GitHub-first deployment model

GitHub is the canonical source of protocol, relay configuration, and deployment metadata. GitHub Pages publishes the public Neogram interface and the non-secret relay contract snapshots.

Public Pages surfaces:
- `/neogram/` — canonical browser frontend
- `/neo-telegram/` — legacy compatibility alias
- `/api/neo-telegram/status.json` — product/network status
- `/api/neo-telegram/protocol.json` — NTP registry
- `/api/neo-telegram/identities.json` — public identity-binding registry
- `/api/neo-telegram/routes.json` — transport capability registry
- `/api/neo-telegram/relay-config.json` — relay limits and policy
- `/api/neo-telegram/relay-contract.json` — authenticated relay API contract

GitHub Pages is static hosting. It does not execute the writable relay. `server.mjs` is the reference implementation for an authorized runtime environment.

## Authenticated request contract

Every protected relay request uses:
- `x-neogram-identity`
- `x-neogram-timestamp`
- `x-neogram-nonce`
- `x-neogram-public-key`
- `x-neogram-signature`

The signature covers:

```text
METHOD
PATH
TIMESTAMP
NONCE
SHA256_HEX(BODY)
```

The reference algorithm is ECDSA P-256 with SHA-256. Requests outside the allowed clock-skew window or with a reused nonce are rejected.

## Relay operations

- `POST /v0.5/relay/register` — register/refresh the authenticated identity's public relay binding.
- `POST /v0.5/messages` — submit an already encrypted and signed NTP envelope.
- `GET /v0.5/mailbox/{neo_id}` — retrieve ciphertext envelopes addressed to the authenticated identity.
- `POST /v0.5/messages/{message_id}/ack` — acknowledge receipt.
- `GET /health` — inspect relay capability metadata.

## Store-and-forward policy

The relay rejects plaintext payloads. Stored objects must contain encrypted message ciphertext, an NTP signature, nonce, destination, and expiration. The relay applies message-size, TTL, request replay, and per-identity rate limits and removes expired items from its in-memory reference store.

## Security boundary

Private signing and encryption keys never belong in GitHub, GitHub Pages, relay configuration, or relay storage. The relay should only see public identity material, routing metadata, encrypted payloads, signatures, and delivery state. The current relay runtime is a reference prototype and is explicitly not a live NVSN production service.
