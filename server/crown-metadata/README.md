# Crown asset metadata adapter

Implemented and locally tested; not deployed. No asset descriptions were changed and no Bitcoin transaction was signed or broadcast.

## Compatibility

Counterparty enhanced metadata uses an on-chain description pointing directly at an HTTPS `.json` file returning HTTP 200 without redirects. This module exposes `/assets/{asset}/info.json` with the exact asset name, description, 48x48 RGB PNG icon, and website. The description links to `/assets/{asset}/manifest.json`. The richer manifest links to `/assets/{asset}/card.svg`. A Crown-aware explorer reads the manifest and renders its additional fields. Existing explorers may only show the icon and description; universal rendering is not implied.

References: https://docs.counterparty.io/docs/basics/assets/enhanced-asset/ and https://tokenscan.io/api . Confirm TokenScan's current ingestion behavior on a pilot before bulk updates. The supplied adapter does not establish a new blockchain consensus layer; Crown here is an application metadata layer over Bitcoin / Counterparty assets. A visual card does not change a fungible asset into an NFT.

## Integration contract

- `createAssetRecord(raw, extra, options)` builds a legacy enhanced envelope and Crown manifest. Supply must be an integer string in raw units, not a rounded JS number. `observedAt` and `sourceUrl` are mandatory. Input snapshots are supplied by a trusted ingestion process; these functions do not independently verify ledger truth.
- `inventoryIssuedAssets(wallets, listIssuedAssets)` consumes all cursor pages and filters records by actual issuance address. Include historical issuance records, not just current holdings or current owner. Assets transferred away still belong in the historical issuance inventory but may not be editable by the original issuer.
- `resolveDescription()` accepts inline JSON or HTTPS manifests at explicitly configured, operator-controlled origins. Do not allow user-selected origins; do not configure internal hosts. Native IPFS/Arweave resolution is not implemented. Pin permitted public gateways deliberately in a future resolver.
- `createMetadataServer({store})` exposes read-only public endpoints with CORS. Inject a durable store implementing `get(asset)`. Firestore is not wired. Public records must be curated; never include private treasury balances, holdings, access tokens, or internal records.
- `renderCard()` produces deterministic SVG presentation with escaped text and no scripts or external resources. The included PNG is a shared compatibility icon. Generated cinematic artwork and PNG card rasterization remain future integrations. The SVG is a typographic fallback, not AI-generated artwork.
- `content_hash` covers UTF-8 JSON serialization of the manifest excluding `content_hash` and `hash_algorithm`. To verify, parse, remove those two fields without reordering remaining keys, JSON.stringify and SHA256. This is content integrity, not an issuer signature or Bitcoin anchor. No claim of wallet control is made.
- Market data intentionally remains null. Add sourced price, quote currency, pair/venue, observation timestamp and staleness semantics through a separately validated feed; never infer price from supply, issuance, or target value.

The optional issuer label and card status are operator-curated claims. Lock status means supply lock only and does not imply funding, legal status, backing or activity. Legacy envelope asset limits are enforced (24 characters); long subasset display names remain separate from the canonical numeric asset ID.

## Wallet onboarding and smallest live gate

Repository reference `server/neo-edge/server.mjs` records World Treasury address `18FyntJG9hdXYvanm67mGgbyo1P7adckvg`. Its current control and full issuance history were not verified during this implementation. No verified Security Wallet address or exact KnowIndex canonical asset ID was found. Test fixtures are deliberately not live records.

1. Verify both role/address assignments and retrieve paginated issuance history plus current ownership / description-lock state from Counterparty.
2. Review a public-only inventory and curate each asset's metadata; do not publish treasury account data.
3. Wire the durable store and deploy public metadata hosting. Verify HTTPS 200, MIME, icon, manifest hash and content before transaction composition.
4. Pilot KnowIndex: verify canonical asset name, controlling wallet and description editability. Prepare a description-only update to the hosted `info.json` URL, with current supply preserved. Review fee and transaction contents in the signer. Description-locked or transferred assets require individual handling; do not automatically reissue quantity.
5. Confirm TokenScan retrieval/display, then expand to the reviewed inventory. No bulk signing or broadcasting is implemented here.

Run: `node --test server/crown-metadata/*.test.mjs` from repository root.
