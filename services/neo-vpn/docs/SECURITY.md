# NEO VPN Security Policy

## Core controls

1. **Deny by default.** A peer receives only the network routes required for its role.
2. **One identity per device/service.** Never share a WireGuard private key between users, bots, servers, or phones.
3. **Private keys stay off Git.** Generate keys on trusted endpoints and store secrets outside source control.
4. **Separate zones.** Admin, service, bot, and development peers must not automatically receive lateral access to one another.
5. **Fast revocation.** Lost, retired, or compromised peers are removed from the gateway immediately.
6. **Application auth remains mandatory.** VPN membership alone does not authorize financial, administrative, publishing, or destructive actions.
7. **High-impact actions require explicit authorization.** Transaction approval, issuance, treasury actions, credential changes, deployment promotion, and other privileged operations must retain their own approval controls.
8. **Audit metadata, not payloads.** Record peer identity, connection state, configuration revisions, and security events while minimizing sensitive traffic logging.
9. **Patch the gateway.** Apply operating-system and WireGuard security updates on a defined maintenance cadence.
10. **Recovery is tested.** Maintain documented procedures for key rotation, gateway replacement, configuration restoration, and emergency peer revocation.

## Recommended segmentation

- `admin`: executive and administrator endpoints
- `services`: internal APIs/datastores reachable only where required
- `bots`: automation workers with narrowly scoped routes
- `development`: non-production systems
- `public`: internet-facing applications; never treat public exposure as VPN-trusted

## Kill switch

Managed endpoints should use firewall rules that prevent protected NEO traffic from leaving outside the VPN tunnel when the tunnel is expected to be active. Implementation is operating-system specific and must be tested before enforcement.

## DNS

Use an approved resolver through the tunnel for private NEO names. Validate that private DNS requests do not leak to the local network or ISP.

## Secrets

Never commit:

- WireGuard private keys
- wallet private keys or seed phrases
- API secrets
- database credentials
- session cookies
- CES credentials
- recovery codes

Public WireGuard keys are identifiers and may be stored in controlled configuration, but private keys remain secret.
