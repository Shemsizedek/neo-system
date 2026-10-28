# NOMNI token and bill publication

The Counterparty asset NOMNI (asset ID 6195210, mainnet) has its description set to
https://crown.holytemples.org/assets/NOMNI/tokenscan.json. That existing on-chain
pointer associates the token with this off-chain publication. No new issuance,
supply change, or blockchain transaction is required to repair the HTTP route.

Render service `neo-nomni-metadata` publishes this directory as a static site.
Consequently, the nested `assets/NOMNI/tokenscan.json` file is required: a root
`tokenscan.json` alone does not satisfy the on-chain URL. Root and nested JSON
aliases must remain identical; `nomni-publication.test.mjs` checks this contract.

The 1 NOMNI Bill is the issuer-designated one-unit artwork for the same NOMNI
asset. `bill-1.json` links back to the token and records its denomination and the
SHA-256 of the exact issuer-provided JPEG. The original bytes are republished at
`assets/NOMNI/nomni-bill-1.jpg` to keep metadata and artwork available together.
`image_large` exposes the artwork in TokenScan's legacy/CIP25 renderer; `files`
links its denomination/integrity record. `denominations` preserves the explicit
machine-readable token-to-bill relationship for other consumers.

This is a metadata association, not an immutable on-chain artwork hash or proof
that any individual printed bill is funded. Paper circulation requires individual
serials, a verified funding/escrow model, redemption and double-spend controls.
Those controls are the next gate before claiming a redeemable physical bill.

Verification: `node --test server/crown-metadata/nomni-publication.test.mjs`.
After deployment, verify the exact description URL returns HTTP 200 JSON without
redirects, check the artwork bytes against the recorded digest, then inspect
TokenScan `/api/asset/NOMNI` and its rendered page for imported additional data.
TokenScan's independent importer can lag or require a re-fetch after earlier 404s;
a healthy hosting deployment alone does not prove the explorer has imported it.
