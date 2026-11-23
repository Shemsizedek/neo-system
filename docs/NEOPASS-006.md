# NEOPASS-006 — Authenticated wallet-link API

Adds an opt-in Node HTTP service factory. The existing public Tokenworks server is unchanged. Configuration requires an HTTPS origin, trusted session verifier and challenge/registry store; missing configuration cannot start the factory.

Routes (same-origin requests with explicit Bearer authentication only):

- POST /api/v1/neopass/wallets/challenges — creates a challenge bound to the verified account/session.
- POST /api/v1/neopass/wallets/verify — verifies a legacy Bitcoin signature, rechecks session validity and persists the wallet association.
- GET /api/v1/neopass/wallets — lists only the authenticated account's active links.
- POST /api/v1/neopass/wallets — revokes the authenticated account's specified wallet link.

Client identity fields are rejected; account/session always come from the trusted verifier. JSON bodies are limited to 8 KiB. Responses use no-store and do not expose authentication tokens. Storage failures reject access with generic errors.

SQLite now persists verified wallet links. A wallet/network pair cannot be overwritten by another account, even after revocation. Revocation disables the association; it does not move funds or revoke the wallet's Bitcoin keys. Account migration/recovery requires a separate reviewed workflow. Registry methods are internal trusted capabilities and must never accept unverified caller records directly.

Validation: 80 tests pass across Tokenworks and Noogle Connect. New HTTP integration tests use actual legacy Bitcoin signatures and real SQLite files, covering account isolation, nonce replay, wrong origin, forged identity fields, session revocation, wallet conflicts, link listing and revocation. Earlier restart tests cover persistent challenge storage.

Remaining: provision and certify the live session verifier, CounterPay message-signing interface, rate limits/timeouts at the ingress, persistent disk and access permissions, wallet-link recovery, passkey enrollment/recovery and signed-in mobile/security-key tests. Only legacy P2PKH signatures are supported. The identity verifier remains injected and is mocked in these HTTP tests; real issuer interoperability is not certified.

No service is started automatically. No Render configuration/deployment, production authentication, escrow, custody or asset transfer is activated by this gate.
