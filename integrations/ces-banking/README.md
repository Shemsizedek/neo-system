# Project 144 — CES Bots / Bitcoin / NEO Bank / Modern Treasury / Fedwire Evidence Gate

Decision: link records through an independent NEO financial gateway. Never federate administrative privileges or equate different assets and ledgers by convention.
Status: CODE READY FOR REVIEW, LIVE INTEGRATION NOT VERIFIED. No payment initiation, ledger posting, V-Dollar issuance, custody assertion, or account balance edits authorized.

## Verified evidence 2026-10-29
- Browser read-only observation: authenticated-looking NMNI CES **Administration Index** was available in a previously open browser tab; it exposed reporting and transaction/admin functions. This proves access to a browser admin page, **NOT an authenticated NEO Bot CES session**.
- SECURITY INCIDENT: some legacy CES Admin Index links embed credentials directly in URL query strings. Do not copy any real URL query, account secret, token, or screenshot into GitHub/CI/chat logs. Rotate affected CES login credentials, invalidate previous sessions where possible, audit access, and use distinct least-privilege service authentication after operator review.
- NEO repo `server/neo-bots/deployment-runtime.mjs` still uses `createStubCesAdapter()` as its default; `neoBotsDeploymentHealth` explicitly reports `liveCesExecutionEnabled:false`. NEO Bank Bot includes privileged CES scopes but any write path remains guarded. A bot registration or user-granted admin role does not confirm an actual production session.
- Repo has `server/neo-bots/ces-session-adapter.mjs`, `services/ces-browser-gateway`, `apps/neoscan/adapters/ces/`, `server/neo-bank`, `server/neo-credit-reconciliation`, and `server/nibiru-reserve/reconciliation.mjs`, but read-only authenticated production data ingestion has not been verified.
- Connected Render NEO workspace has existing staging services, including `neo-counter-render-staging`. Service discovery is NOT authentication to CES or to Modern Treasury; no deployments were triggered.
- Modern Treasury dashboard was open in the browser; reading page content was denied by browser host permissions. No connected Modern Treasury API credential, active bank connection, account, permission set or payment order is independently verified.
- No evidence of a direct Fedwire participant relationship or participant service-provider authorization has been obtained. Fedwire routing must be performed through an independently verified eligible bank or authorized sponsor, never direct from a CES bot.

## Trust zones and event flow

Zone 1: NMNI/XCPC CES administration -> specifically approved read-only reports. Minimize scope and remove PII, secrets, bank account details, session cookies and user-password-bearing URLs before any transfer.
Zone 2: NEO Bitcoin/Counterparty -> independently synchronized blockchain observations with chain/network, block hash, confirmations and reorg status. NOMNI, XCP and BTC remain distinct assets.
Zone 3: NEO Bank/Pay/FX private ledger -> immutable references to evidence, not automatic crediting. No CES value-movement approvals, payouts, FX trades, or NOMNI redemption on this gate.
Zone 4: Modern Treasury -> **separately authorized** account-viewing evidence from Finance Viewer and Ledger Viewer or stricter role. Read-only balance reports, transactions, bank connections and ledger entries; zero Payment Order create/review, Expected Payment reconcile/write, external account mutation, or API key administration.
Zone 5: Bank sponsor/Fedwire -> external source-of-truth for actual wires, with bank confirmation and reconciled identifiers as appropriate. Fedwire participant access, agency delegation, operating circular requirements and liability remain separate from CES or MT identity. Do not infer transfer finality from a CES internal credit.

Evidence-only adapter `integrations/ces-banking/reconciliation-gate.mjs` accepts a small allowlist of sanitized record fields and exact decimal strings for source/type/asset-separated totals. It blocks CES URLs with *any* query parameters, external origin, paths not explicitly allowlisted and all POSTs; it rejects credentials or PII fields, non-native assets, duplicate references, invalid types and unit crossovers.
All outputs explicitly refuse to certify operator access, bank connectivity, USD reserve custody, Fedwire participation, redemption, or money movement. Report-reference matching, even with equivalent numerical amounts, is NOT a settlement, a 1:1 exchange, or a bank reserve.

## Authorized activation sequence (separate milestones)
1. Rotate any legacy CES credentials exposed through URL links and invalidate old sessions. Review account permissions, audit logs and credential storage. Do not use admin session URLs as API auth.
2. Obtain an independent evidence-only CES Bot account/role. Verify fresh login and approved read-only report access in isolated session without rendering secrets; lock down outbound origin and strict response classification.
3. Obtain *current* NMNI and XCPC report snapshots with a timestamp and completeness proof, under private access control. Reconcile credit/debit totals and V-Dollars without treating CES credit as USD reserve.
4. Obtain permitted Modern Treasury sandbox or scoped read-only access; verify bank connection, account identity/ownership, and view-only permissions. Use separate credentials/secrets from NEO Core and CES.
5. For actual banking flows, verify applicable US and cross-border licensing, KYC, AML, OFAC, counterparties, bank mandate, Fedwire participation and processing capabilities with actual institution. Bank balances and bank reports must come from bank-reported records (not CES).
6. On staging, align timestamps, canonical currencies, immutable source IDs, receipts, ledger variance and exception queues with synthetic data and non-transacting bank observations. Require audit logging, error/reorg handling, independent bank reconciliation and backup/rollback.
7. Any live action requires a separate narrow approval policy, transaction-specific authorization, human multi-party confirmation, amount limits, sanctions review, idempotency, monitoring and kill switch.

## References
- CES administrative documentation: https://www.community-exchange.org/docs/admin.html
- Modern Treasury account reconciliation: https://docs.moderntreasury.com/ledgers/docs/account-reconciliation
- Modern Treasury permissions: https://docs.moderntreasury.com/platform/docs/standard-permission-set-reference
- Federal Reserve Fedwire eligibility and operation: https://www.frbservices.org/financial-services/fedwire-funds-service/
- Existing NOMNI evidence draft PR #1270 and Coinbase BTC-only isolation draft PR #1266 remain independent unmerged work.

## Test command
`node --test integrations/ces-banking/*.test.mjs`

## Gate 2: CES Bot report reader plugged into the existing runtime (staging injection only)

`ces-bot-report-adapter.mjs` adds a **strictly read-only** adapter that can be injected into the existing NEO bot runtime; the existing deployment factory deliberately retains its stub default, so unconfigured production code cannot initiate CES requests.

```js
import { createNeoBotsDeploymentRuntime } from '../../server/neo-bots/deployment-runtime.mjs';
import { createCesBotReportAdapter } from './ces-bot-report-adapter.mjs';
// sessionProvider must be supplied by a separately verified secure deployment.
const cesAdapter = createCesBotReportAdapter({ sessionProvider, onAudit });
const runtime = createNeoBotsDeploymentRuntime({ cesAdapter });
// The existing 'ces.transactions.review' bot action can now retrieve only
// a SHA-256 report proof from an already authenticated NMNI/XCPC session.
```

Credential handling stays **outside this adapter**. Session-provider deployment remains a distinct step after CES admin login credential rotation and scope minimization. Never pass credential-bearing navigation links from the legacy CES admin page. Do not treat an open browser page as proof that an independent bot has authenticated.

The adapter accepts only named report routes, only GET and manually handled redirects, strict same-origin response, explicit session verification, limited HTML size, and a sanitized audit sink. It returns only a SHA-256 checksum and report metadata; **no raw CES member records, statements, V-Dollar credits or credentials are returned or forwarded to Modern Treasury**. All issuance, approval and update methods are disabled even if the bot runtime grants a generic approval token. The original bot runtime still ships with its no-op adapter by default.

`server/neo-bots/ces-legacy-crawler.mjs` now excludes any link/form/redirect with URL query parameters or cross-origin credentials from the persisted manifest; `server/neo-bots/ces-session-adapter.mjs` drops credential-bearing form actions and redacts all form field values from discovery results. Tests use synthetic secrets only.

To advance beyond this gate: provision a dedicated, least-privilege CES Bot session provider in a controlled runtime; confirm a fresh independent bot session; run an authenticated read-only smoke against NMNI report metadata; inspect private report schema for authorization/provenance; only then add a separate explicit ingestion-to-NEO reconciliation job. Modern Treasury and Fedwire capabilities remain **external bank data adapters, not CES Bot privileges**. No live banking payment calls are part of this PR.

New checks: `node --test integrations/ces-banking/*.test.mjs server/neo-bots/ces-legacy-crawler.test.mjs server/neo-bots/ces-session-adapter.test.mjs`.
