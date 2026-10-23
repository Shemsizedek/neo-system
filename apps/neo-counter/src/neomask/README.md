# NMASK-033 NeoMask checkout bridge
Read-only merchant-scoped wallet bridge and NEO Counter wallet entry panel.
The panel intentionally does not assert a provider is installed or show fabricated balances. `bridge.mjs` implements network, merchant-session, receive-evidence and payment-review authorization contracts; it does not sign, broadcast or settle.
Tests: `node --test apps/neo-counter/src/neomask/bridge.test.mjs`.
Activation requires verified NEO Pass, independent BTC/Counterparty backend, merchant-authorized provider negotiation, and end-to-end staging receipt verification.
Never trust a browser-provided 'verified' boolean as production cryptographic proof; validate server-side with independently authenticated readers before enabling any address or payment display.