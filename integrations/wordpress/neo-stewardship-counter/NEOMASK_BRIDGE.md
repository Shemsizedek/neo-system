# NeoMask wallet bridge — Gate 10
The checked-in NeoMask implementation found during repository review is deploy/noogle-render/neomask-registration.mjs. It handles RP-locked WebAuthn registration, is not exposed as an HTTP route, and does not sign Bitcoin transactions.

This gate adds a NEW wallet-routing interface, neomask-bridge.mjs, compatible with the existing NEO Pay window.neoBitcoinSigner consumer. It does not pretend a NeoMask browser wallet provider already exists.

A trusted NeoMask host or extension imports installNeoMaskBridge and supplies a real adapter with:
- name
- ledgers: explicitly supported classic/cp20 identifiers
- connect({origin,ledger}) returning {address,network,ledger}
- getAccount({origin,ledger}) for account continuity
- signRawTransaction(hex,{origin,ledger,source,requireUserApproval:true})
- optional disconnect()

installNeoMaskBridge(scope,{provider,origin:'https://holytemples.org',ledger,expectedAddress}) installs the provider for the existing stewardship wallet-connect.mjs consumer. It rejects an existing registered signer, wrong origin and undeclared ledgers. Each signing request requires a connected account and checks mainnet, ledger and account continuity before and after the wallet call. It requests wallet-side explicit approval. Merchant setup uses the configured treasury as expectedAddress. Passkeys alone are never converted into Bitcoin signing authority.

Tests pass for origins, ledgers, account continuity, disconnected signing rejection, explicit wallet-review request, registration collision and removal. Tests use synthetic unsigned/signed hex fixtures and do not prove cryptographic transaction validity or wallet authority. A production transaction layer must independently decode the returned signed transaction and verify its intended inputs, outputs, asset message and fees before broadcasting.

Status: bridge source and unit tests committed to PR #1014. This module has NOT been installed into a NeoMask extension, connected to a real wallet, or exercised with a signed transfer. No NeoMask adapter for NEOpay, CounterPay or Freewallet is asserted to be available solely from this interface. Public plugin remains v0.8.0; no new payment capability has been enabled.

Next implementation: wire a real wallet adapter inside the NeoMask host/extension, then exercise origin approval, ledger selection, treasury account connection, reviewed transaction signing and independently verified transfer/delivery. Preserve private keys inside the originating wallet.
