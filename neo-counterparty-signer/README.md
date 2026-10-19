# NEO Counterparty signer bridge — Gate 001

Reusable non-custodial issuance bridge for NEO Pay, CounterPay, NeoMask and Tokenworks. The first deployed consumer is the existing owner-private CounterPay Sites app at `/issuer.html`. Other applications are not activated by adding this package.

The bridge uses XCP Wallet's supported provider through @xcp/wallet-sdk v0.5.0. No mnemonic, private-key, WIF or recovery-phrase inputs exist. This is a bridge to a device-controlled signer, not a new independently audited key vault.

## Contract

Import `createNeoSigner` from `bridge.mjs`. Supply same-origin `origin`, synchronous durable browser `storage`, `onState(state)` and asynchronous `onReview({intent,feeSats,maxFeeSats})`. A consumer connects explicitly, then invokes `issue(intent,{feeRate,maxFeeSats})`. `policy.mjs` exports the approved STANSHARES intent and independent unsigned-transaction checks.

Implement an authenticated, same-origin `/api/signer/v2` Counterparty gateway. The deployed first consumer allows only the exact STANSHARES issuance parameters, issuer, OP_RETURN encoding, bounded fee rate and miner fee, plus node/asset/funding-transaction reads. Do not expose an arbitrary proxy. The SDK composes with GET; the gateway must return upstream status and JSON faithfully, use no-store, and reject redirects. Broadcast occurs through the connected XCP Wallet provider, never through a server with keys.

The local verifier checks a single ARC4-obfuscated OP_RETURN, standard CBOR issuance, exact asset ID, quantity, divisibility, lock/reset flags, description, no external Bitcoin outputs, issuer-owned inputs authenticated against parent transaction hashes, and a bounded miner fee. Unsupported legacy payloads, multisig encoding and Taproot reveals fail closed. Signed bytes must preserve the reviewed unsigned envelope. Wallet identity and mainnet are checked before signing and relay.

Each address/asset gets a local submission journal entry before broadcast. An uncertain broadcast blocks automatic resubmission. The user must verify the recorded txid; clearing browser storage is not proof that a previous issuance failed. This browser journal is not a global issuance ledger. Corporate authorization and share register are outside token creation.

## NEO Pay rollout

Use this package through a separately built bundle in the existing NEO Pay module; preserve watch-only flows and require explicit issuer permissions. Add the allowlisted authenticated compose/funding-read gateway, a fee review, wallet popup, submission record and confirmation view. Do not enable exchange orders, transfers, sweeps or Treasury interfaces through this issuance gate.

## Validation

The CounterPay consumer passed 46 tests, including altered payloads, external outputs, forged parent data, fee ceilings and gateway denials. A live unsigned STANSHARES compose passed local verification at 552 sats miner fee on 2026-10-19. No signing or broadcast was performed. Real XCP Wallet approval, signed relay, on-chain acceptance, mobile signing and other NEO consumers remain unverified. Standard Android Chrome cannot run the Chromium extension; a supported desktop/Chromebook browser is required for this first bridge.

Dependencies are pinned; the source repository supplies the SDK under MIT. ARC4 extraction follows XCP/extension's MIT-licensed protocol code. ARC4 here is protocol obfuscation, never encryption for wallet secrets.
