# NEOpay Transaction Execution Gate

NEOpay uses Counterparty Core API v2 compose routes to construct unsigned Bitcoin transactions. The consumer wallet must not sign a composed transaction until it independently verifies the Bitcoin transaction inputs, outputs, destination, Counterparty payload, fee, and sighash preimage against the user's reviewed intent.

## Current gate

- Restore original Counterwallet wallet locally.
- Require the active portfolio address to equal the in-memory signing address.
- Compose a Counterparty send using `/v2/addresses/{address}/compose/send`.
- Display source, destination, asset, amount, and reported Bitcoin fee for explicit review.
- Keep local signing and broadcast disabled.

## Required before enabling signing

1. Parse the unsigned Bitcoin transaction locally.
2. Resolve each input's previous output and scriptPubKey.
3. Verify every input belongs to the active wallet or is explicitly understood by the composer flow.
4. Decode/verify Counterparty transaction data against requested asset, quantity, and destination.
5. Verify all Bitcoin outputs, including change, data carrier, and dust outputs.
6. Calculate the actual transaction fee from input and output values and enforce a user-visible fee ceiling.
7. Construct the correct sighash for every wallet-owned input.
8. Sign each input locally with the matching Counterwallet child key.
9. Re-parse the signed transaction and verify txid/outputs before broadcast.
10. Broadcast only after a second explicit user confirmation, then surface the txid and NEOscan link.

No recovery phrase or private key may be sent to the compose API, backend, logs, analytics, or persistent browser storage.