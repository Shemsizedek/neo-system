# Approved NEO Crown issuance intents · NEO canonical metadata

Only **operator-reviewed initial Counterparty issuance intents** belong in this folder. A filename is the canonical asset ID, for example `NEOASSET.json`. Do not place test names, unapproved offers, wallet secrets, addresses of unrelated third-party issuers, private valuation claims or templates here.

## Required phases

1. Submit an issuance intent PR with canonical asset, user-controlled public issuer address, positive raw quantity, issuer-curated plain description, safe website, and `approval.state = approved_for_metadata_publication` only after real operator review. Link to the reviewed PR in `approval.review_reference`. The code verifies the record format, **not the authenticity of reviewer identity**; repository branch protection and audit review remain mandatory.
2. Leave `tx_hash` unset while planning. The staging workflow prepares `apps/neoscan/web/cardmaster/assets/<ASSET>/tokenscan.json` and must deploy it to the **exact canonical hostname**, then pass `--preflight` before the signer shows the user a transaction.
3. After the user separately signs and broadcasts the approved initial issuance, NCC-017 automatically searches Counterparty's **creation event** for each reviewed asset and validates the exact issuer, quantity, description, block and at least six confirmations. An exact `tx_hash` may still be supplied as an additional constraint, but is **not required** for event discovery. The first card is staged as immutable off-chain artwork only after those checks and a successful canonical JSON readback.
4. No workflow signs, broadcasts, pays fees, updates supply, or changes issuer ownership. A description-update event is not a new token issuance.
5. If the canonical domain is unavailable, the job must fail closed. Do not change the user's wallet description to a temporary Render URL without separate approval.

**Not active for new users yet:** the actual Crown signer has not been verified as integrated with this GitHub intent pathway, and the Render deploy hook / canonical hostname still require authorized setup.

## NEO Layer 3 automated showcase fields

A reviewed issuance may include an optional `showcase` object that declares **presentation choices**, not independently verified legal or financial rights:

```json
{
  "showcase": {
    "instrument_type": "bond",
    "style": "aurum",
    "public_title": "NEO Bond Showcase"
  }
}
```

The category must be one of the existing 18 Layer 3 genres; the visual finish must be one of the existing studio finishes. For privacy, public insurance policy or claim card titles are forced to the immutable on-chain asset identifier rather than names of insured people or claimants. Never put private customer names, private policy details, secrets, reserve assertions, guaranteed returns, unapproved securities offering language or unreviewed personal data in a public intent.

**Brand distinction:** NEO canonical metadata is the public-facing brand. An asset name such as `NOMNI` is an immutable Counterparty **technical identifier** inside an already-signed on-chain description URL. The software must preserve exact identifiers for lookup, file locations, on-chain matching, and indexer parsing; changing them would break verification. Never reissue or change ownership merely to match a branding preference.

## Staging trigger and real limits

The staging workflow runs after an approved-intent file is pushed to `feat/ncc-007-render-runtime-hardening` or via authorized GitHub Actions `workflow_dispatch`. It can independently discover the first-issuance transaction without a browser-issued webhook. The existing Render static service has **auto-deploy disabled** and its approved hook secret has not been verified, so GitHub files are not proof of public hosting. **A recurring GitHub schedule runs only from the default branch**, while this staging workflow is not installed there. Continuous unattended polling and the real wallet issuance composer remain activation dependencies; no false claim of end-to-end autopilot until those are connected and independently tested.
