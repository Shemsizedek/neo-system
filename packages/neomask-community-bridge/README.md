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

## 0.2.0 — NEO Pay / Counterpay vault integration

`neomask-vault.mjs` provides the actual adapter for the existing NeoMask extension provider. `apps/neopay/neomask.mjs` and `apps/counterpay/neomask.mjs` export application startup installers. Call the matching installer before wallet discovery, on a site where the member has enabled NeoMask. No extra approval UI or keys are implemented in the website: the installed extension supplies its existing origin-bound permission and PSBT review popups. The extension currently signs all owned PSBT inputs and checks all outputs; this adapter does not promise partial input signing.

These installers are source integration entry points, not changes to a running NEO Pay or Counterpay deployment. They expose the wallet only after installation on the application page. They intentionally cannot register as Freewallet: Freewallet still requires its own companion integration. No invented Freewallet signing API or public wallet endpoint is used.

Tests now include a simulated two-window popup round trip and the complete SDK → owned wallet adapter → existing merchant router flow, including declined signing and account mutation. Provider responses remain test doubles; no installed extension UI or funded transaction was exercised by these tests.

## 0.3.0 — Freewallet companion

The companion now implements real PSBT signing using the NEO repository's existing reviewed signer. It runs inside a trusted Freewallet build and uses that wallet's existing `FW`, `getWallet`, `getWalletAddressInfo` and `getPrivateKey` APIs. Private keys never cross the bridge or appear in responses. It supports unlocked indexed/imported Legacy mainnet accounts; watch-only and hardware accounts are rejected. A ledger must be explicitly configured to match the wallet installation.

The inspected upstream implementation is [Freewallet Desktop fdb7f2f97eae876fa59ec77bc5dd1707a27a7eb2](https://github.com/jdogresorg/freewallet-desktop/blob/fdb7f2f97eae876fa59ec77bc5dd1707a27a7eb2/js/freewallet-desktop.js). Its `signTransaction` path calls `checkDonate` and assigns version 1 in the Legacy path. This companion deliberately uses the reviewed PSBT signer instead of that mutating function. No upstream files or private keys are copied into this SDK.

From the NEO repository root:

```
npm --prefix apps/neomask-extension ci
node packages/neomask-community-bridge/build-freewallet.mjs
node packages/neomask-community-bridge/freewallet.test.mjs
```

Install the generated `dist/freewallet-bridge.js` in the trusted wallet page after Freewallet's runtime. Then call:

```js
NeoMaskFreewallet.startFreewalletCompanion(window, {
  ledger: 'cp20', // Must match this wallet deployment, never infer from address
  merchantOrigin: 'https://holytemples.org',
  allowedMerchants: ['https://holytemples.org']
});
```

The wallet's dedicated HTTPS popup route must retain its opener to exchange exact-origin messages. It must initialize the Freewallet runtime and its approved unlocked account. Do not embed an unlock secret or copy sessionStorage from another origin. If the runtime is unavailable, this companion refuses the request. Desktop NW.js installations need a separate native/browser-extension transport; this HTTPS popup transport does not magically connect to a local desktop process.

The included approval UI uses wallet-local native confirmation with the caller's origin, ledger, account, every destination and amount, change, fee, input count and decoded bond transfer. It signs only when all inputs belong to the selected account and have been explicitly requested. Unknown Counterparty messages and unsupported transaction shapes are rejected by the existing signer. It does not implement general-purpose arbitrary-asset signing or broadcast.

`freewallet.test.mjs` creates an unfunded synthetic key, signs a real PSBT, verifies its ECDSA signature and checks exact outputs, fee and transaction version. It also verifies declined approval occurs before key access, plus wallet lock, watch-only and network rejection. This is stronger than a mock signing test, but it is not evidence of an installed Freewallet build or production checkout. The upstream wallet has not been modified or deployed by this commit.

After building, run `node packages/neomask-community-bridge/bundle.test.mjs` to verify the standalone browser artifact loads without Node globals or remote imports. The build injects a bundled Buffer implementation for the Bitcoin dependency. Build output is reproducible from source and excluded from version control.
