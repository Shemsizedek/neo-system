# NEO Cipher #D — 999/144 Yamassee Secure Script Protocol

## Status

Foundation framework. This module provides an authenticated encryption envelope and a Yamassee/Nuwaubian glyph carrier for NEO System communications.

## Security model

The security boundary is cryptographic, not typographic.

- Encryption: AES-256-GCM through the Web Crypto API.
- Passphrase key derivation: PBKDF2-HMAC-SHA-256 with a random 128-bit salt.
- Default PBKDF2 work factor: 310,000 iterations.
- Message nonce/IV: random 96-bit value per encryption.
- Authentication: AES-GCM 128-bit authentication tag.
- Domain separation: `NEO-CIPHER:#D:999:144:v1` is authenticated as additional data.
- Transport: base64url-safe envelope wrapped in the `YAMASSEE-CARRIER-1` format.

`999`, `144`, and `#D` are NEO protocol identifiers and symbolic structural constants. They do not replace random keys, salts, nonces, cryptographic entropy, or security review.

## Yamassee/Nuwaubian font layer

The licensed `YAMASSEEGLYPH` font may render the carrier payload as Yamassee/Nuwaubian glyphs. The repository intentionally does not include or redistribute the font file.

The underlying carrier remains machine-readable text so NEO services can serialize, sign, transmit, store, and recover encrypted envelopes without depending on font rendering.

## Flow

`plaintext -> AES-256-GCM -> authenticated NEO envelope -> Yamassee carrier -> glyph rendering`

Recovery reverses the process:

`glyph carrier -> NEO envelope -> authentication check -> AES-256-GCM decrypt -> plaintext`

## Secret material

The module can generate cryptographically random secret tokens with `createSecretToken()`. Password/passphrase policy remains separate from the Yamassee visual layer.

Language-derived password and passphrase generation is intentionally not implemented yet. It should be added only after authoritative language materials define valid vocabulary, morphology, transliteration, and semantic rules. Language vocabulary must never be treated as entropy by itself; any generated credential must retain cryptographically secure randomness.

## Licensing boundary

Future token-gated licensing may control lawful access to the Yamassee/Nuwaubian font or presentation resources. Token ownership must not be used as an encryption key by itself. Authentication and entitlement proofs should remain separate from cryptographic key management.

## Security claims

This project must not describe the system as mathematically unhackable. Its objective is strong, reviewable defense-in-depth using established cryptographic primitives plus NEO-specific transport, policy, and cultural presentation layers.
