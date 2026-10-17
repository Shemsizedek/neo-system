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

## Current release boundary
The deployed WordPress connector now uses NeoMask exclusively. The 0.2.0 extension remains a developer installation restricted to holytemples.org. This contract is reusable by the community, but community-wide extension distribution and external-wallet adapters are not released by this change. Do not claim Chrome Web Store availability, verified xcpdex/xcp.io interoperability or production token delivery.
