# NeoMask Community Bridge 0.1.0

Both ends of an opt-in wallet connection protocol for Freewallet.io, Counterpay and NEO Pay. Horizon and XCP Wallet keep their existing native adapters. This SDK is working integration code, not a deployed modification of third-party wallets.

## Wallet integration

Import `createWalletHost` and `servePopupBridge` from `index.mjs` into a dedicated HTTPS wallet route. Supply the wallet's actual `connect`, `getAccount`, `disconnect` and `signPsbt(hex, ledger, options)` methods. Declare only ledgers that wallet really supports: `classic`, `cp20`, or both. Accounts must explicitly return `{address, network:'mainnet', ledger, signingAvailable:true}`. This checkout currently requires Legacy P2PKH accounts.

`approve` must present the requesting origin and require user approval. For signing, decode the PSBT and display outputs, amounts, fees and signing inputs in the wallet's trusted UI; reject if decoding or review is unavailable. The SDK never receives keys, unlock passwords or seeds. It does not broadcast transactions or custody funds.

```js
const request = createWalletHost({wallet: actualWallet, ledgers:['cp20'], approve: showWalletApproval});
servePopupBridge(window, {merchantOrigin: approvedMerchantOrigin, request});
```

The wallet route must validate its merchant origin using its own configuration or explicit user selection. Do not silently trust a URL parameter. Protect the route against framing, unsafe script injection and opener navigation. Approval sessions expire after ten minutes and are bound to exact HTTPS origin, random session, account and ledger. A closed popup requires reconnecting. Every signature requires fresh wallet approval.

## Merchant integration

```js
const transport = popupTransport(window, {url: YOUR_DEPLOYED_WALLET_BRIDGE_URL});
registerWalletBridge(window, {
  id: 'neopay', // 'counterpay' or 'freewallet' for those wallet integrations
  ledgers: ['cp20'],
  request: transport.request
});
// Run before discoverNeoMaskWallets(window, router).
```

Alternatively inject `registerWalletBridge` from an extension content bridge and supply an authenticated extension RPC transport as `request`. Do not publish arbitrary merchant-configured wallet URLs as trusted Freewallet endpoints. No third-party endpoint is assumed or fabricated by this package.

`connect`, `getAccount`, `signPsbt` and `disconnect` are the only host methods. Signing requires `options.signInputs` mapping the connected address to explicit input indices; SIGHASH_ALL is enforced. The host rejects account changes before and after signing. Account changes are also checked by the NeoMask router before and after each request.

Run `node bridge.test.mjs`. Tests use synthetic PSBT envelopes and mock wallets, not funded wallets; they verify protocol boundaries rather than Bitcoin signature validity. Production activation still requires wallet-side integration, wallet UI review and a real wallet test on a non-funded/test environment. This SDK does not enable merchant payment settlement or automatic inventory delivery.
