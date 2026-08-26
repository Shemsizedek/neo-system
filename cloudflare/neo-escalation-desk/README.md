# NEOsync Escalation Desk

Authenticated Government-side Enterprise oversight surface for delegation and escalation governance.

## Capabilities

- View all pending Enterprise approvals.
- Highlight approvals already escalated.
- Highlight approvals due within six hours.
- Edit primary and backup approvers per organization.
- Edit time-based escalation windows.
- Configure amount-based approval bands.
- Create temporary delegated authority with expiration and optional amount caps.
- Review delegation history.

The desk does not sign wallets, move funds, execute payments, operate merchant terminals, or perform legal/enforcement actions. It governs only Enterprise approval authority and escalation eligibility.

## Required environment

- `ACCESS_TEAM_DOMAIN`
- `ACCESS_AUD`
- `ADMIN_EMAILS` (optional allowlist)
- `ENTERPRISE_FEDERATION_URL`
- `MODULE_ADAPTER_TOKEN`

`MODULE_ADAPTER_TOKEN` must match the secret configured on `neo-enterprise-federation`.
