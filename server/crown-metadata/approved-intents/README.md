# Approved Crown issuance intents

Only **operator-reviewed initial Counterparty issuance intents** belong in this folder. A filename is the canonical asset ID, for example `NEOASSET.json`. Do not place test names, unapproved offers, wallet secrets, addresses of unrelated third-party issuers, private valuation claims or templates here.

## Required phases

1. Submit an issuance intent PR with canonical asset, user-controlled public issuer address, positive raw quantity, issuer-curated plain description, safe website, and `approval.state = approved_for_metadata_publication` only after real operator review. Link to the reviewed PR in `approval.review_reference`. The code verifies the record format, **not the authenticity of reviewer identity**; repository branch protection and audit review remain mandatory.
2. Leave `tx_hash` unset while planning. The staging workflow prepares `apps/neoscan/web/cardmaster/assets/<ASSET>/tokenscan.json` and must deploy it to the **exact canonical hostname**, then pass `--preflight` before the signer shows the user a transaction.
3. After the user actually signs and broadcasts through a separately authorized wallet, add the real transaction hash to this same approved intent. The workflow verifies the Counterparty Core API, asset owner, transaction source, first-issuance block, exact quantity, token description and at least six confirmations, and records a receipt on success.
4. No workflow signs, broadcasts, pays fees, updates supply, or changes issuer ownership. A description-update event is not a new token issuance.
5. If the canonical domain is unavailable, the job must fail closed. Do not change the user's wallet description to a temporary Render URL without separate approval.

**Not active for new users yet:** the actual Crown signer has not been verified as integrated with this GitHub intent pathway, and the Render deploy hook / canonical hostname still require authorized setup.
