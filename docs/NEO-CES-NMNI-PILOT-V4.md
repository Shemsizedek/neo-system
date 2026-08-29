# NEO-CES NMNI Coordinator Pilot v4

This gate adds a controlled pilot runner for the NMNI CES exchange.

## Modes

- `DRY_RUN`: validates configuration only. It does not request CES credentials, create a login session, or collect authenticated data.
- `AUTHORIZED_READ`: requires verified selector environment variables and server-side CES credentials. It remains read-only.

## Required secret keys for authorized mode

- `CES_NMNI_USERNAME`
- `CES_NMNI_PASSWORD`
- optional `CES_NMNI_TOTP`

## Verified selector keys

- `CES_NMNI_SELECTOR_USERNAME`
- `CES_NMNI_SELECTOR_PASSWORD`
- `CES_NMNI_SELECTOR_SUBMIT`
- `CES_NMNI_SELECTOR_AUTHENTICATED`
- optional session-expiry and row selectors for offers, wants, balances, activity, and transactions.

Selectors are deployment configuration, not source constants. Do not commit coordinator credentials or authenticated member data.

## Safety boundary

The pilot cannot create transactions or members. Authorized raw-text collection must pass the existing CES read permissions and collection policy. The pilot clamps collection to at most 1,000 rows per kind and defaults to 250. NOMNI metrics are derived after collection and remain separate from source CES observations.

## Runtime requirement

A production deployment must supply a `CesBrowserDriver` implementation. The repository intentionally does not couple this layer to a specific browser vendor.
