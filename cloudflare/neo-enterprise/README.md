# NEO Enterprise Accounts + Organizations

Private multi-organization control plane for the NEO Enterprise Suite.

## Account model

Organization types: `PRIVATE_COMPANY`, `PUBLIC_COMPANY`, `SOLE_PROPRIETOR`, `INSTITUTION`.

Organization visibility: `PUBLIC` or `PRIVATE`.

Roles: `EXECUTIVE_ADMIN`, `ORG_ADMIN`, `FINANCE_ADMIN`, `OPERATIONS`, `MEMBER`.

The executive administrator configured through `ADMIN_EMAILS` has global enterprise administration capability. Seed organizations also include the `Shemsizedek` executive-admin profile so the founding organization set starts under one executive control identity.

## Seed ecosystem organizations

The initial registry creates profiles for NEO Systems, Shelton Estate & Co., World Temple of Karast — Branch Temple No. 24, N.I.A. / Project 144, Global Interdependent School District, and Noone University / NEO University. These are NEO ecosystem profiles and are not assertions of external corporate or governmental status.

## Capabilities

- organization profiles
- member/team registry
- role and permission model
- business public-wallet bindings
- NEO Counter / NEO Teller terminal registry
- NEO Books / CFO operating integration surface
- audit trail
- Cloudflare Access authentication
- Durable Object persistence

## Required Cloudflare variables

- `ACCESS_TEAM_DOMAIN`
- `ACCESS_AUD`
- `ADMIN_EMAILS`

Public-facing Enterprise marketing remains on GitHub Pages. The authenticated Enterprise admin console runs through this Worker.
