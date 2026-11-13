# NEOPASS-005 — Legacy Bitcoin ownership verification

Adds verifyBitcoinOwnership, a Bitcoin Signed Message adapter using exact-pinned bitcoinjs-message 2.2.0 and bs58check 2.1.2 dependencies in the root manifest/lockfile. No homegrown signature recovery implementation is used.

Supports legacy P2PKH only. Base58Check payload and network version are validated before signature verification. The adapter requires a canonical base64 65-byte compact signature with a legacy header. P2SH, SegWit, Taproot, BIP-322 and unknown networks fail closed. Testnet and regtest share an address version; their distinct NEOpass network labels are bound by the signed challenge message, not address encoding alone.

Validation: 75 tests pass across Tokenworks and Noogle Connect, including a fixed upstream example, real signatures generated from a public disposable fixture key, altered messages/addresses/signatures, wrong address network, unsupported formats, and a full NEOpass challenge/replay test. The verifier accepts the server-generated message, never a replacement supplied by the client.

Reference: https://github.com/bitcoinjs/bitcoinjs-message (upstream README signature example and verify API).

This is local cryptographic compatibility testing, not an independent security audit or certification with a signed-in user's device. Actual CounterPay message signing, authenticated routes, durable wallet identity records, passkey enrollment and recovery remain outstanding. The adapter is available for injection into createNeopassWalletProof; no public route or production default is activated.

No Render resource, deployment, wallet signing permission, custody or asset transfer is changed. Fixture private keys are public test data and must never receive funds.
