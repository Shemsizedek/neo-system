# NTEL-017 — Android Native Diagnostic Bridge & NeoMask Wallet Proof

The Omnitrix Android app now has a **read-only** native Java helper using platform ConnectivityManager, NetworkCapabilities and EuiccManager to inspect cellular/Wi-Fi availability and eSIM feature state, only after opt-in. This helper is not wired to an activity or production telemetry endpoint. It uses existing ACCESS_NETWORK_STATE permission and does not require telephony identity privileges.

Added a Node wallet ownership adapter requiring authenticated NEOpass subject, cryptographically verified BIP-322 signed challenge, and atomic one-use nonce consumption through injected trusted server adapters. The BIP-322 verifier and durable nonce store are **not** installed or connected: do not pass client-supplied booleans as verifier results. A signature validates control of the relevant Bitcoin signing policy, not legal ownership of a phone, service or identity.

No SIM profile is created or downloaded. No on-chain entitlement or token is minted. No AI can control radio subscriptions, emergency calling, the wallet signer, or provider account.

Next NTEL-018: connect actual native diagnostic UI and consent storage, implement trusted backend BIP-322 verification and replay-safe nonce persistence, test on physical phone, then separately approve production changes.
