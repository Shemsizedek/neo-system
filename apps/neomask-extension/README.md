# NeoMask — Bitcoin wallet extension foundation
Version 0.1.0. Chrome/Chromebook Manifest V3 development extension.

This is the first installable site-permission shell, not a finished asset wallet. It has no key vault, transaction signing, broadcast, asset balance service or payment activation. It accepts public watch-only addresses only. It is not affiliated with MetaMask and does not use Ethereum signing methods.

## Install for development
Download this folder from the repository. Open chrome://extensions, enable Developer mode, choose Load unpacked and select this folder. Reload https://holytemples.org/holy-stewardship/. No Chrome Web Store publication was performed. Run python package.py to build a ZIP containing runtime files.

## Page API
window.neoMask.request({method:'connect',params:{ledger:'classic'}})
window.neoMask.connect({ledger:'cp20'})
window.neoMask.getAccount({ledger:'cp20'})
window.neoMask.disconnect({ledger:'cp20'})

Connection opens an extension-owned approval window displaying the actual sender origin and selected ledger. Enter a public legacy address. Full Base58Check validation is performed. Grants expire after ten minutes and are separate for each origin/ledger. The toolbar popup can revoke all grants. No private-key ownership is implied.

The extension injects only on holytemples.org in this first build; it does not request all-sites access. Service-worker origin checks reject frames and other origins. Storage is restricted to trusted extension contexts. Page messaging is untrusted; the page cannot approve requests or invoke extension UI commands. Requests expire; worker restart fails closed rather than reconstructing approval. A site can request connection but cannot sign or broadcast.

The page API intentionally does not register neoBitcoinSigner or a fake signRawTransaction method. This prevents the existing NEO Pay capability detector from falsely advertising transaction readiness. Integrating the watch-only provider into the stewardship UX is a separate change.

## Scope still required for MetaMask-like Bitcoin wallet operation
Audited secp256k1 key generation/derivation and encrypted vault; recovery/backup and lock; validated transaction construction; PSBT/raw transaction decoding and human-readable approval; asset-bearing UTXO protection; wallet-controlled signing; independent post-sign intent verification; confirmation/reorg handling; separate Classic/2.0 asset inventory and delivery; extension packaging and browser end-to-end tests.

The previously added neomask-bridge.mjs defines an adapter contract but does not supply a wallet signer. This extension does not reinterpret passkeys as Bitcoin private keys.

## Verification
Run node policy.test.mjs. JavaScript syntax and package structure checked. Unit tests do not constitute a real browser install, wallet connection, signature, transfer or production security review.
