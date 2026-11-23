# NEOPASS-011 — Noogle NEOpass identity provider and NeoMask security boundary

## Product contract

Use the customer-facing label **Continue with Noogle NEOpass**. Noogle NEOpass is the proposed identity provider; NeoMask is an optional wallet/device approval layer. Relying websites explicitly register and integrate the provider. The verified CounterPay wallet association is a foundation, not yet an independent Noogle login or cross-site session.

Implement a standards-based OpenID Connect authorization-code flow with mandatory S256 PKCE, state/nonce binding, exact HTTPS callback registration, server-controlled authentication and consent, short-lived audience-bound credentials, revocation and published issuer keys. Do not treat a wallet address, unlocked vault, email match or client-supplied identity as login proof. Keep client-specific identifiers and disclose wallet addresses, balances or roles only under separate explicit permissions.

References reviewed: https://openid.net/specs/openid-connect-core-1_0.html and https://www.rfc-editor.org/rfc/rfc9700.html.

## Implemented in this gate

server/neo-platform-api/noogle-neopass-provider.mjs is an isolated server grant core, not a complete OIDC server. It validates registered clients/callbacks, identity-only scope, nonce/state/PKCE requirements, trusted authentication and consent dependencies, active identity status, two-minute single-use codes, verifier binding and per-client pseudonymous subject derivation. Its exchange result explicitly requires subsequent token issuance. It creates no JWT, cookie, public discovery document or live endpoint. The store must atomically consume hashed codes and be durable in production.

The NeoMask extension now derives RPC origin from browser-supplied top-frame sender metadata and requires matching extension identity/HTTPS origin. It rejects a page's claimed different origin. Permission grants require a trusted extension approval bridge, accept only requested permissions, and take selected accounts from that approval rather than the page. Without the approval bridge they fail closed. This gate does not implement that UI or distribute/update the extension.

## NeoMask scope

- Communities can integrate the provider for compatible Bitcoin/Counterparty wallets; supported address/signature formats must be declared and tested individually.
- Browser support requires an installable extension and the APIs/permissions of that browser. Begin with the Chromium Manifest V3 implementation; Firefox, Safari and mobile require separate compatibility work.
- Require per-site connect/account disclosure, separate ownership signing, transaction review and revocation. Keep secrets in local/hardware signers; never collect browser passkeys, biometric templates or wallet recovery phrases through websites.
- Browser protection may include approved origin checks, transaction warnings and phishing signals. An extension cannot guarantee universal browser protection, replace browser/OS security, or make third-party sites accept NEOpass without integration.

Chrome extension reference: https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure.

## Validation and next release requirements

96 platform/NeoMask tests pass. New tests cover authorization/consent, invalid callback/scope, PKCE/expiry/client mismatch, concurrent replay, forged sender origins, missing approval UI and permission escalation.

Before public login activation: complete independent Noogle account/passkey enrollment and recovery, use a reviewed OIDC server/token implementation, add signing keys/JWKS and rotation, persistent client/code/session/consent registries, issuer/audience validation and login callback CSRF checks, logout/revocation, rate limits, and live testing with a registered first-party NEO client. Complete the trusted NeoMask approval UI and browser packaging/security review. Do not publish a working-looking login button before the provider can complete the flow.

No production service, existing authentication, extension distribution, wallet signing permission, asset transfer or browser setting changed in this gate. CounterPay owner-only linked-wallet functionality remains the verified live capability from NEOPASS-010.
