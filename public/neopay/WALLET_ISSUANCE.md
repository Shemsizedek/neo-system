# Counterpay wallet issuance — Project 144 staging gate

## Scope

The existing \`public/neopay/\` portfolio had original Counterwallet recovery and read-only Bitcoin/Counterparty balances. This change adds new-wallet creation and recovery on top of that existing page.

- **Create:** Generate a 24-word BIP39 mnemonic (256-bit entropy) locally in a secure HTTPS browser.
- **Derive:** Use the existing BIP32 key derivation module and the Bitcoin mainnet P2PKH derivation path \`m/44'/0'/0'/0/0\`.
- **Backup:** Display the recovery phrase locally and require three randomly selected words before showing the address portfolio.
- **Recover:** Restore standard 12- or 24-word BIP39 wallets separately from historical Counterwallet wallets. Standard BIP39 wallets are *not* compatible with Counterwallet's proprietary 12-word phrase format.
- **Portfolio:** Once confirmed, show BTC/XCP/NOMNI balances from public read-only APIs. Address metadata only, never a seed or private key, is put in session storage. A page reload returns as watch-only.
- **Lock:** Clear the active in-memory signer and visible recovery words. JavaScript strings cannot be guaranteed securely erased from process memory; users should close their private browsing session and keep devices secure.
- **Payments:** No new transaction signing, token issuance, key escrow, asset transfers, or broadcast support. Existing signing and broadcast controls remain disabled.

## Threat model and blockers before production

1. Verify that \`counterpay.holytemples.org\` is actually backed by this \`public/neopay/\` page or deploy it to the intended Counterpay site separately.
2. Test on a real HTTPS-hosted staging build, especially Android and desktop, including lost/recovered sessions and browser storage.
3. Verify real BIP39 test vectors and independently derive/restore the same address with another compatible Bitcoin wallet. The unit tests here isolate the app logic with stubbed cryptography; they are **not** a cryptographic audit.
4. Bundle/pin cryptographic libraries within the app build and deploy with a strict Content Security Policy. The current \`public/neopay/\` code already relies on third-party ESM CDN imports for BIP32; this change also loads BIP39 from a pinned CDN URL. Review the supply-chain and secure-context implications before accepting real customer keys.
5. Get a security review for wallet generation, entropy, signing lifecycle, cross-origin scripts, XSS, nonce handling, mobile backgrounding, logs, and disaster recovery.
6. Decide the relationship to NeoMask/NEOpass and NEO Counter only after testing the wallet independently.
7. Keep financial asset issuance and payment activation in separate, explicitly gated workflows, with legal/compliance and merchant-authorization checks.

## Verification performed during implementation

- \`node --test public/neopay/wallet-issuance-core.test.mjs\`: 5 passing tests on the local implementation copy (creation parameters, restore round trip with fake crypto, invalid phrase, insecure context, cleanup on derivation error).
- \`node --check\` of local core and browser module copies: passed.
- The rendered UI, real cryptographic vectors, live domain mapping, and production behavior have **not** been verified.

## Next gate

Stage this branch on an HTTPS test host, verify backed-up wallet recovery using test-only funds or zero-balance addresses, audit CSP and dependency integrity, then review a separate decision for transaction signing. No mainnet payment or asset issuance should occur within this gate.
