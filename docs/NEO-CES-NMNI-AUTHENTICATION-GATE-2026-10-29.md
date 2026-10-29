# NMNI CES authentication gate — 2026-10-29

Interactive CES login and NMNI administrator access were verified in the operator's browser. The initial read captured 33 monthly rows from the administration Trading Statistics report. That history is not a current balance, USD reserve statement or V-Dollar reconciliation. No authenticated member data or credentials are included in this change.

## Verified login contract

The official login page was inspected through its visible DOM on 2026-10-29.

| Item | Observed value |
| --- | --- |
| Origin | `https://www.community-exchange.org` |
| Login page | `/home/user-login/` |
| Form method and action | `POST /rlogin.asp` |
| Account field | `uid` |
| Password field | `passwd` |
| Submit button | `action=login` |
| Successful member navigation | `/memac.asp?off=2` |
| Protected member-page marker | `Noocratic Open Market Nibiru Index` |
| Interactive administrator index | `/_admin/admain.asp` |
| Initial aggregate report | `/_admin/statstrading.asp` |

`nmni-login-profile.mjs` captures the non-secret member-login contract. Its provider reads only `NEO_CES_NMNI_USERNAME` and `NEO_CES_NMNI_PASSWORD` from the server environment. It does not reuse the operator browser's cookies, create service credentials or activate the deployment runtime.

## Authentication behavior

Previously the default session validator accepted an HTTP 200 response without checking that a login had succeeded. The default now requires a configured protected-page GET and an exchange-specific page marker. A returned password form, a missing marker, an expired/failed response, a mismatched login redirect or an untrusted origin cannot establish authentication. HTTPS and URLs without embedded credentials are required. The protected-page check is read-only; the only submitted form in the login test is the login form itself.

Custom injected session validators remain an explicit integration/test extension point. They are responsible for their own authentication proof. The deployed bot runtime continues to use its disabled live adapter until it is deliberately configured.

For the generic environment credential provider, deployments must now supply both `NEO_CES_<EXCHANGE>_AUTHENTICATED_PATH` and `NEO_CES_<EXCHANGE>_AUTHENTICATED_TEXT`, in addition to the previously required login settings. The verified NMNI provider supplies these non-secret values directly, including the required submit button value.

## Current deployment evidence

The connected Render account lists 22 services in the previously authorized **NEO workspace** (`tea-db8bbpij9qps73cb7gb0`). None is a dedicated CES bot, CES browser gateway or NEO Bank service, and the listed start commands do not launch the NEO Bank server. This does not establish the state of other hosting providers. Public NEO Bank health and community-status checks were inaccessible through the web retrieval tool; this is inconclusive for availability.

Source inspection confirms that `getNeoBotsDeploymentRuntime()` still constructs the no-op CES adapter and reports `liveCesExecutionEnabled: false`. NEO Bank's server exposes no CES snapshot import endpoint. Browser authentication alone therefore does not connect the bots or populate the NEO Bank database.

## Validation

Run from the repository root:

```bash
node --test server/neo-bots/*.test.mjs apps/neoscan/adapters/ces/*.test.mjs
node --input-type=module -e "import {nmniReadiness} from './server/neo-bots/nmni-login-profile.mjs'; console.log(JSON.stringify(nmniReadiness(), null, 2))"
```

The preflight performs no network requests, prints only configuration presence and non-secret login metadata, and always distinguishes configuration from verified authentication. Fixture tests do not establish unattended live authentication.

## Next milestone and dependencies

1. Establish the intended existing server runtime or a confirmed no-cost staging target. Verify its health and deployment version.
2. Provision the two NMNI credentials in that runtime's approved secret store. Do not copy browser passwords or cookies into chat, repository files, screenshots or build variables.
3. Run the profile against CES and require the protected-page proof. Keep the result separate from administrator authorization.
4. Review the user-to-admin transition and a bounded administrator report allowlist. The member-login profile cannot claim administrator access merely because the interactive browser has it.
5. Add an authenticated, source-preserving NEO Bank ingestion path before importing. Do not turn historical aggregate turnover into account balances or payment permissions. Reconcile member accounts, transaction references, units and V-Dollar positions separately.

No deployment, credential provisioning, ledger import, member update or financial transaction is part of this source change.
