# NTEL-016 — First Android NeoTele Device Pilot

## Implemented
- Five-step Android checklist: eUICC enabled, unlocked carrier, Wi-Fi, verified provider-trial eligibility, and diagnostics consent.
- Privacy-minimized optional network observations: transport, coarse signal level (0–4), network validated state, roaming, timestamp; excludes IMEI, EID, ICCID, IMSI, phone number, location.
- NeoMask entitlement OFFCHAIN_DRAFT builder requiring trusted wallet ownership and Guardian approval. Uses server-side HMAC-SHA256 commitments with a minimum 256-bit secret; no raw identity fields or wallet keys in draft.

## Real phone procedure
1. In Android settings, check that an eSIM can be added, and confirm carrier unlock directly with device/current provider.
2. In a future Android app, test `EuiccManager.isEnabled()`; this gate does not call Android APIs directly.
3. Ensure Wi-Fi access and evaluate Verizon/T-Mobile trial rules on their sites; US Mobile trial may require port-in. Do not upload IMEI to GitHub or the blockchain.
4. The user, not NeoTele, installs the legitimate carrier-issued eSIM using the carrier app/Android Settings.
5. With explicit diagnostics consent, a future trusted on-device integration may report only reduced network observations.
6. NeoMask/Guardian can attest a **service entitlement draft** off-chain after real wallet/device verification; no Counterparty token mint or transfer is performed.

## Security and truth constraints
- A free consumer carrier trial does not authorize Noogle Telecommunications to issue or manage that carrier's eSIM.
- Android eUICC profile download/switch is permission- and carrier-privilege-gated; NTEL-016 performs **no such operation**.
- HMAC keys must be managed in trusted backend secrets, with rotation, separation by environment, revocation policy, and strict privacy review. A device-backed wallet proof is not implemented yet: caller's flags must be established in a trusted server adapter.
- No AI has authority to modify actual profiles, change an external account, make emergency routing changes or sign Bitcoin transactions.

Unit tests: `node --test server/neotele/*.test.mjs`. CI integration, Android native sensor adapters, device trial enrollment and production deployment are separate gates.
