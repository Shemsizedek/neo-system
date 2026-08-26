# Historical Counterwallet recovery

NEO Bank reproduces the original Counterwallet-compatible legacy derivation rather than treating pre-May-2014 wallets as BIP39.

The historical algorithm decodes the 12-word Counterwallet mnemonic to entropy, converts that entropy to its hexadecimal string, preserves the old JavaScript `bytesToWordArray` coercion behavior, computes HMAC-SHA512 with the literal key `Viacoin seed`, uses the first 32 bytes as the root private key and the final 32 bytes as the chain code, then derives `m/0'/0/i`. Historical recovery scans indexes 0 through 9.

Recovery phrases, entropy, and private keys remain client-side and are not persisted.