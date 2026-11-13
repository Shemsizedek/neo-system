# NEOPASS-010 — Live owner wallet-link verification passed

Observed October 24, 2026 on https://counterpay.holytemples.org/#settings after the user completed the ownership-signing ceremony.

## Live evidence

1. CounterPay displayed: "Wallet ownership verified and linked to your owner account. Your wallet is locked."
2. The agent reloaded the Settings page.
3. The agent selected Check linked wallet, triggering a fresh authenticated status request.
4. CounterPay displayed: "This wallet is linked to your signed-in owner account."
5. The wallet remained locked and its local encrypted signer remained configured.

The selected Bitcoin address and account identifiers are intentionally omitted from this public record. No private keys, recovery phrases or raw signatures were inspected by the agent. The user approved signing in the wallet. No payment, token update, asset transfer or escrow action was performed.

## Release scope

NEOPASS-009 is published as CounterPay Sites version 21. The deployed runtime uses Sites owner identity, a local legacy P2PKH Bitcoin Signed Message signer and D1 persistence. Version 21 source commit: 8fb80990df7407fd8124949a13bd18c2615f3776 in the separate CounterPay Sites source repository. Its 108-test suite passed before deployment.

This gate confirms a live owner-account wallet association and persistence across a browser reload. It does not independently certify D1 backups, multi-device recovery, every rejection case in production, public registration, new WebAuthn credential enrollment, hardware-key assurance, cross-Site SSO or Crown Chain attestations. Existing Node reference modules in this draft PR remain unmerged and are not the live runtime.

## Next development scope

Build an explicit NEOpass identity exchange for other NEO services using issuer/audience-scoped credentials and a revocable wallet-link status contract. Sites user IDs differ across Sites; do not equate them or expose account/wallet associations through a public lookup. Complete passkey enrollment/recovery and supported hardware-key testing before describing the system as Bitcoin passkey login.
