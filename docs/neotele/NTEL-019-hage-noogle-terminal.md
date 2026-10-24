# NTEL-019 — Noogle Connect + Hage Terminal Integration

**Architecture:** NeoTele requests read-only diagnostics through NEO Wire → NEOpass/NEO Guardian device authorization → Noogle Connect transport → trusted Android diagnostics app. Hage supplies canonical command IDs. A Nuwaubian/English Rosetta lexicon can map localized labels to these IDs after linguistic review; no claim is made that Nuwaubian translations or a native Hage compiler are implemented.

This gate implements a three-command server allowlist and injected authorization/dispatch interfaces. No arbitrary command strings are passed to shell, Hage source is not executed, no remote root/ADB access is implied, and no eSIM profile can be issued. This branch does not contain the newer Noogle Connect mobile repository paths found on main; merging or cherry-picking should reconcile main before connector binding.

## Actual APK certification
Android UI from NTEL-018 must still be compiled using the repository's Android Gradle workflow. The branch has no certified APK artifact in this gate. Record the actual GitHub Actions run, Android Gradle compilation status, APK SHA-256 and install result on the consenting user's phone before calling it certified.

## Cryptographic wallet verification
NTEL-017 BIP-322 adapter is a boundary only. Select and test a trustworthy server verifier against standard BIP-322 vectors, require unique stored nonce and expiry, and verify the signed message is bound to NeoTele, the wallet, the NEOpass subject and the device. Do not approve NeoMask ownership from a flag.

## Next gate
NTEL-020: reconcile Noogle Connect mobile with NeoTele feature branch, connect signed device-bound requests and device-local consent, add reviewed Hage/Nuwaubian lexicon entries, then run Android build and physical-device smoke test.
