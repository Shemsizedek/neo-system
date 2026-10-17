# NeoMask 0.3.0 — encrypted wallet and real Bitcoin/Counterparty signing
## What this build does
- Imports a compressed Bitcoin-mainnet WIF locally inside an extension-owned vault page, or generates a new single-key account using the browser CSPRNG.
- Encrypts the key with AES-256-GCM and PBKDF2-SHA256 (600,000 rounds, random salt and IV). The address is authenticated as additional data.
- Keeps the encrypted vault in extension-only storage. No key or password is sent to a website, WordPress, GitHub or an API node.
- Approves per-site, per-ledger account connections in an extension popup. Grants expire after ten minutes and can be revoked.
- Reviews and signs legacy P2PKH Bitcoin PSBTs using secp256k1 and SIGHASH_ALL. Requires full previous transactions, checks input ownership, exact recipients, change and fees, then validates produced signatures before finalizing.
- Locally composes and independently decodes bounded TEMPLEBOND/PLEDGEBOND enhanced sends: Classic binary format and Counterparty 2.0 CBOR format. Verifies asset ID, atomic quantity, destination and BTC outputs. Sweeps, unknown assets/message types, unknown data outputs, unsafe sighashes and diverted BTC are rejected.
- Requires a password and explicit approval for every signature. The approved PSBT SHA-256 digest is checked again before signing.
- Returns signed bytes and transaction ID to the requesting site. It does not broadcast or claim on-chain confirmation.

## Install the packaged build
1. Unzip NeoMask-0.3.0-Community-Build.zip on the Chromebook/desktop.
2. Open chrome://extensions, enable Developer mode, choose Load unpacked, and select the extracted neomask-extension folder.
3. Open NeoMask, then Open wallet vault. Import the existing account locally if it must control the treasury. A newly generated account will not control an existing address.
4. Reload https://holytemples.org/holy-stewardship/, choose the ledger, sign in as administrator and use Connect treasury via NeoMask. It must return 1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8.
5. Wallet signatures are approved locally. Never send recovery material through chat or website forms.

The extension has not been installed in the user's browser by the agent. No user key was imported, no real funded transaction was signed and no broadcast occurred during development.

## Source build
npm ci
npm test
npm run build

Load the generated dist/ folder. The root background.mjs/popup.mjs/vault-ui.mjs wrappers also point at the generated build, but dist/ is the release package root. package-lock.json pins dependencies; no remote runtime script or eval is used.

## Page API
window.neoMask.connect({ledger:'classic'})
window.neoMask.getAccount({ledger:'cp20'})
window.neoMask.composeBond({asset:'TEMPLEBOND',quantityAtomic:'100000000',destination:'...',inputs:[{previousTx:'<full hex>',index:0}],feeSats:'2000'},'cp20')
window.neoMask.signPsbt('<PSBT hex>','cp20')
window.neoMask.disconnect({ledger:'cp20'})

A sign request requires an unexpired site grant and an extension-owned password/approval prompt. Signing is bound to the stored account, selected ledger and exact PSBT. Page JavaScript never receives the key. Holy Temples is enabled initially. On another HTTPS website, open NeoMask, click Enable NeoMask on this site, approve Chrome’s permission for that site, then reload it. The site must integrate the NeoMask API; enabling access does not make arbitrary dApps compatible. Each site and ledger still needs account approval, and every signature needs separate review. Remove site access through Chrome’s extension settings; the background rechecks host permission before handling requests and before delivering signed bytes.

## Protocol scope
Only compressed-mainnet legacy P2PKH accounts are supported. This is a single-key WIF vault, not an HD recovery-phrase wallet. Taproot/multisig envelopes, MPMA, sweeps and unrelated Counterparty commands are not supported.

The asset encodings were checked against Counterparty Core sources:
counterparty-core/counterpartycore/lib/messages/versions/enhancedsend.py
counterparty-client/src/counterparty/{extract,decode,address}.rs

Classic and 2.0 share Bitcoin transactions. A transaction may affect both ledgers; selecting a ledger does not create replay protection between them. Funding UTXOs must be screened for attached assets on both ledgers before production input selection, and source asset inventory must be independently verified. The composer expects explicit funding inputs; it does not perform that screening or promise asset availability.

## Payment verification
src/settlement.mjs contains independently tested exact-output, confirmation, expiry, replay-claim and canonical-block/reorg checks. It is a verification component, not a deployed settlement service. Its canonical block observation and claimedBy value must come from trusted server lookups and a durable, atomic unique txid:vout claim. It is not yet wired into the WordPress order database.

WordPress plugin v0.9.0 has been deployed to consume NeoMask signing accounts. Payable invoices, authoritative persisted payment verification, inventory reservation, broadcast and confirmed delivery remain disabled pending end-to-end integration. No production collection was activated.

## Validation performed
npm test covers encryption/password/tampering, real secp256k1 transaction signatures, mutated intent and wrong-account rejection, unsafe sighashes, Classic/2.0 bond payload decoding/signing, diverted BTC and sweep rejection, payment exact-match/replay/reorg/expiry logic and the background request-to-approval-to-signature flow using mocked Chrome APIs.
A synthetic fixture key was used only for offline tests. These checks do not replace an actual browser install, funded end-to-end transfer or independent security review.

## Recovery
No server recovery is available. The original WIF backup remains necessary to recover a lost/corrupted vault or forgotten password. No plaintext key export feature is exposed after import.

## 0.3.0 community connector
- Original green-and-gold NeoMask N mark and extension icons.
- Optional, exact-site HTTPS permissions through the extension popup; no automatic access to all sites.
- A reusable application router in integrations/wordpress/neo-stewardship-counter/neomask-router.mjs supports the native NeoMask vault, XCP Wallet's documented provider (Counterparty 2.0 route), and NEOpay providers that explicitly expose ledgers, connect/getAccount/disconnect and PSBT signing.
- Wallet choice is explicit. Account and network continuity are checked before and after signing; account-change events invalidate the session. No automatic broadcast or signing retries.
- XCP signing uses xcp_signPsbt. Plain-Bitcoin xcp_signBitcoinPsbt payment intents are not implemented by this adapter. Returned signed PSBTs still require application-side transaction verification before any relay.
- CounterPay can register the same adapter contract when its wallet-side provider is available. No CounterPay browser provider was found in the inspected repository. Freewallet's external bridge remains unimplemented; neither is listed as a live option.
- Developer build distribution only; no Chrome Web Store listing or actual user-browser install was performed. XCP Wallet compatibility was tested with API fixtures, not a funded user account.
