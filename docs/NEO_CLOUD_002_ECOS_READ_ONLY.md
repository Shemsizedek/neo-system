# NEO-CLOUD-002 — ECOS read-only evidence bridge

## Purpose

This bridge lets NEO ingest **user-authorized ECOS account evidence** without storing ECOS passwords, session cookies, 2FA values, wallet keys, or purchase credentials.

The current ECOS integration is intentionally **read-only and evidence-first**. As of 2026-10-27, NEO has not verified a public ECOS customer API that exposes authenticated contract, hashrate, payout, or worker/share telemetry.

## Supported evidence sources

- ECOS account/app snapshot
- ECOS personal-account export
- ECOS support confirmation

Snapshots may contain reported contract identifiers, account-reported TH/s, mined-today/all-time BTC totals, wallet balance, and transaction metadata.

## Safety boundary

ECOS-reported TH/s is provider/account-reported evidence, not independent pool-share evidence. Therefore:

- `authoritativeForHashrate = false`
- `allocatableHashrateTh = null`
- `eligibleForNeoCapacity = false`
- `authoritativeForSettlement = false`
- `authoritativeForTokenIssuance = false`
- purchases, withdrawals, resale, and token issuance remain disabled

NEO must not use ECOS dashboard numbers to back customer contracts or token issuance without stronger evidence and approved commercial/legal terms.

## Current pilot acceptance path

1. ECOS shows a paid contract in the authenticated account.
2. Capture the contract ID, status, reported TH/s, start/end or term, and a fresh observation time.
3. Observe the first mining accrual and transaction history.
4. Obtain stronger provider evidence if available: authenticated API, export, signed statement, pool/worker share data, or support confirmation.
5. Separately obtain written permission for any resale, white-label, or customer-facing capacity use.

ECOS support documentation says paid mining contracts are automatically activated and may take up to 24 hours to activate, with first balance credits within 48 hours. ECOS also documents that earnings and contract transactions are monitored through the personal account/dashboard.

References:
- https://ecoshelp.zendesk.com/hc/en-us/articles/360023989471-How-do-I-activate-my-mining-contract
- https://ecoshelp.zendesk.com/hc/en-us/articles/360023744552-How-can-I-monitor-my-earnings
- https://ecoshelp.zendesk.com/hc/en-us/articles/360023989551-How-often-do-the-payments-for-mining-happen

## Local snapshot usage

Keep the snapshot outside source control.

Example:

```json
{
  "source": "ECOS_ACCOUNT_APP",
  "observedAt": "2026-10-27T16:17:00.000Z",
  "account": {
    "totalPowerTh": 600,
    "minedTodayBtc": 0,
    "minedAllTimeBtc": 0
  },
  "contract": {
    "contractId": "replace-with-account-contract-id",
    "status": "ACTIVE",
    "hashrateTh": 600
  }
}
```

Validate locally:

```bash
node server/miner-generator/ecosReadOnly.mjs /path/to/ecos-snapshot.json
```

The validator rejects secret-like fields and does not make network requests or mutate the ECOS account.
