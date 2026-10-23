# NeoMask SDK

NeoMask injects `window.neoMask` into supported web pages.

The site receives an origin-scoped provider, not wallet private keys.

Core flow:

`connect -> request permission -> simulate -> Guardian decision -> user confirmation -> device-local/hardware signer`

Signing methods return signer results only after an external/device-local signer bridge is available. The SDK itself does not hold seed phrases or private keys.

Methods include account access, permission management, transaction simulation, PSBT signing requests, Counterparty signing requests, and message signing.

Websites should treat transaction simulation as advisory preflight and must not treat it as proof that a transaction was broadcast or confirmed.
