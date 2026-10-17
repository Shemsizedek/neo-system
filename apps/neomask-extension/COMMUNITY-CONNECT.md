# NeoMask community connection contract
NeoMask is the NEO Systems connection brand for Bitcoin and Counterparty applications. NEOpay, CounterPay and external wallets integrate behind NeoMask through explicit adapters. Holy Stewardship uses only window.neoMask; it never connects a separate wallet provider directly.

## Identity
Name: NeoMask. Tagline: Bitcoin. Connected.
Primary green: #194b36. Accent gold: #d9b55b.
The original hexagonal N mark is included in the stewardship connector. Do not imply MetaMask affiliation or reuse another wallet's logo.

## Application interface
```js
const wallet = window.neoMask;
if (!wallet?.isNeoMask) throw new Error('Set up NeoMask first');
const account = await wallet.connect({ledger:'classic'}); // or cp20
// Show account.address; verify account.network and ledger.
const signed = await wallet.signPsbt(reviewedPsbtHex, 'classic');
await wallet.disconnect({ledger:'classic'});
```
The isNeoMask flag identifies an API shape, not verified software identity or custody. Treat all page providers as untrusted; independently check returned transactions.

## Adapter requirements
An integrated wallet must expose explicit account permissions, Bitcoin network and Counterparty ledger, signing capabilities, rejection/cancellation, account changes and disconnect. Account addresses are not proof of signing authority. Every signature must be reviewed and approved in the actual signing wallet. Never send keys or recovery phrases to the page or store them in an adapter.

NEOpay, CounterPay and Freewallet compatibility must be implemented and tested for each wallet's supported API. Do not register made-up providers or silently import accounts. Freewallet remains an external wallet until an explicit approved bridge is implemented.

## 0.3.0 release boundary
The NeoMask router ships with native-vault and XCP Wallet adapters plus explicit NEOpay provider discovery. Community sites can import the router module, register an adapter, and call connect({walletId,ledger}). Use list(ledger) to show available choices; do not silently select a wallet. Subscribe with onChange to clear UI state after lock, account changes or disconnect. Native signing returns its signed PSBT, while the application remains responsible for checking its exact transaction before broadcast.

The extension now offers optional exact-site HTTPS access from its popup. A site must still implement the NeoMask API, and permissions do not prove that a third-party application supports it. There is no MetaMask or XCP endorsement, Chrome Web Store listing, or verified xcpdex/xcp.io dApp interoperability in this release.

CounterPay and Freewallet remain pending wallet-side adapters. No compatibility is implied by the shared brand. XCP Wallet's adapter follows its published PROVIDER.md API at upstream commit documented during this release; it does not implement plain-Bitcoin payment signing or broadcast.

Upstream reference: https://github.com/XCP/extension/blob/main/PROVIDER.md
