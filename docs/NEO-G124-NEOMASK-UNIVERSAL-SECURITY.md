# Gate 124 — NeoMask Universal Bitcoin Security & Web3 Extension

NeoMask is the self-custody and site-security interface for Bitcoin/Counterparty applications in the NEO ecosystem.

## Architecture

Website / dApp -> origin-scoped NeoMask provider -> NEO Guardian risk decision -> transaction simulation -> user confirmation -> device-local or hardware signer.

Private keys and seed phrases never cross the website boundary.

## Integration

- NEO Pass: wallet/user authentication and device identity.
- Tokenworks: token-controlled access and asset utility.
- Gate 123: canonical asset/custody/account registry.
- NEO Guardian: domain/phishing/transaction risk policy.
- NEOpay: PSBT and Counterparty transaction construction.
- NEO Counter / ETHA: merchant and terminal payment requests.
- Crown Chain: post-signature evidence references where separately verified.

## Browser-extension security

The Manifest V3 extension requests only extension storage by default. Sites receive permissions only after explicit origin-scoped grants. Signing remains unavailable until a compatible local/hardware signer is connected.

## Universal plugin

Third-party sites can use the NeoMask SDK without receiving a secret key. The provider exposes permission, read, simulation and sign-request methods modeled for Bitcoin/Counterparty workflows.

## Runtime boundary

This gate implements extension/provider/security source. It does not claim Chrome/Firefox store publication, live Guardian reputation feeds, connected hardware wallets, or production Counterparty signing until those components are separately verified.
