# Historical Counterwallet recovery

The pre-May-2014 Counterwallet path is intentionally reproduced from the original Counterwallet-compatible `CWHierarchicalKey.oldHierarchicalKeyFromSeed` implementation.

Compatibility requirements:

- Decode the original 12-word Counterwallet mnemonic to its 16-byte entropy and render it as a 32-character hex string.
- Preserve the historical bug: pass that hex **string** through the old `bytesToWordArray` semantics. Decimal characters coerce to 0–9; `a`–`f` coerce to zero in the bitwise operation.
- HMAC-SHA512 the resulting 32-byte message using the literal key `Viacoin seed`.
- Use the first 32 bytes as the BIP32 private key and the last 32 bytes as chain code.
- Derive legacy addresses at `m/0'/0/i`.
- Historical recovery scans indexes 0 through 9.

Source lineage: Counterwallet/ClearingHouse `util.bitcore.js`, which explicitly states this path is retained for historical compatibility and generates the same old Counterwallet addresses.

Safety: recovery phrases, seed bytes, and private keys are never persisted by NEO Bank. Old-wallet signing remains session-memory only.