# Project 144 — CES Source-Evidence Consumer (stacked on PR #1273)

## Architecture decision

**PR #1273 is the primary CES runtime and authenticated NMNI admin reader.**
This follow-on branch was created from its verified head rather than merging the
incompatible session-adapter changes in draft PR #1272.

- Dedicated runtime: `neo-ces-read-staging` in Render **NEO SYSTEM** workspace `tea-dbhtkc8473hc73933img`, service `srv-dbhtlv4s728c73cuetf0`.
- The last checked Render deploy is `dep-dbhtlvcs728c73cueudg`, based on commit `5afbe4596bba8a887a2f12e8ceed80b059aaa1c8`, status `live`, auto-deploy disabled.
- **Health of a credential-free service does not mean CES admin login or source import works.** Server passwords, restricted Neon URL and runtime bearer token for this dedicated service remain unverified/not provisioned.
- Staged source file and role: `server/neo-bots/ces-source-store.mjs` and `neo_ces_source_imports`, with historical NMNI trading summaries, never bank account balances.
- Existing PR #1272 remains a **draft, not merge-safe as a whole** because generic query-link filtering conflicts with PR #1273's explicitly validated, transient legacy admin transition. Credentials must remain absent from logs, stored manifests and returned data.

## What this branch adds

`integrations/ces-banking/ces-source-import-evidence.mjs` validates source import metadata from `GET /v1/imports` with exact permitted keys:
`id`, `exchange_id`, `observed_at`, `imported_at`, `row_count`.
It refuses unknown fields, bank/member identifiers, balances, metadata claiming USD,
unrecognized exchanges, duplicate hashes and invalid timestamps.

A new test uses PR #1273's own `createCesSourceStore` with a synthetic
`Trading Statistics` report and verifies that source import references can be
read by the consumer without creating a NEO Bank ledger entry or payment instruction.

The NEO Bank Bot now has an authoritative read-only action set. The generic
`NeoBotRuntime` explicitly rejects a caller's `risk: "read-only"` assertion
for other Bank Bot scopes. Approved actions require an exact payload match and
their approval token is consumed synchronously before async execution. This
prevents issuing repeated transactions with one token or changing the approved
recipient/amount between approval and execution.

## Security and deployment gate

1. Run `node --test integrations/ces-banking/*.test.mjs server/neo-bots/runtime.test.mjs server/neo-bots/ces-read-runtime.test.mjs`.
2. Review the stacked PR and PR #1273. Do **not** merge PR #1272 over the dedicated runtime's session code.
3. Once PR #1273 is merged, retarget this PR to `main`; verify CI against the new base and merge only after review.
4. Do not install credentials, alter Render environments, enable source imports or trigger a deployment as part of this code-only gate.
5. When approved to provision the named service, obtain a dedicated NMNI credential entered directly into the Render environment and a restricted Neon connection and runtime bearer token through an approved secret transfer. The runtime must prove both member and admin authorization.
6. Only after verified authentication, safely collect historical source metadata to its dedicated staging table; reconcile with NEO Bank records as separate types. No automatic conversion of NEO CES turnover, NOMNI, V-Dollar credit or external Bitcoin observations into USD reserves.
7. Modern Treasury/Fedwire stays its own controlled read-only evidence integration until independently verified bank-account permissions; no cross-system credentials, transactions, payments or issuance are authorized by this branch.

**This branch does not alter the live CES service, account balances, legal rights, custody, NOMNI, or V-Dollar supply.**
