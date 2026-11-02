# Private backend report connection

The bank backend delegates the reviewed login flow to the source runtime. The upstream account password and session cookies remain there. The login profile is saved in server code, and credentials remain in protected runtime environment configuration. Neither is stored in the browser or included in public account configuration.

Configure the bank service with:

- `NEO_BANK_SOURCE_URL`: the explicitly approved HTTPS origin of the source runtime, with no path, query, or embedded credentials.
- `NEO_BANK_SOURCE_TOKEN`: a dedicated source runtime backend token. It can verify authentication and read cached reports, but cannot import or perform financial operations.
- `NEO_BANK_SOURCE_CONTROL_TOKEN`: a different strong token protecting the bank's internal source controls. Never send this token to frontend code.

All tokens must have at least 32 characters. Store values in server environment configuration and deploy. To disconnect the bank, remove its source token and deploy. Revoke the corresponding backend token in the source runtime as well.

Internal machine routes, requiring the bank control token and rejecting browser Origin headers:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/internal/v1/data-source/status` | Safe backend configuration/reachability status |
| POST | `/internal/v1/data-source/auth/check` | Verify the saved upstream member/admin login flow |
| GET | `/internal/v1/data-source/report` | Read the latest cached, validated historical report |

The full account server also provides `GET /api/v1/reports/trading` to an authenticated executive administrator. Regular members and guests cannot read this exchange-wide report. The staging preview keeps account sign-in and financial writes disabled; it exposes only the machine-authenticated internal report routes.

Reports contain bounded monthly rows, native NEO units, exact decimal strings, observation time, and a source hash. They are historical evidence and do not update balances or ledger entries. Upstream URLs, cookies, raw errors, login profiles, and tokens are excluded from bank responses. Upstream redirects are rejected, response size is bounded, and request routes are fixed in server code. Cached reports remain readable during an upstream login outage. An empty cache returns 404; an upstream login failure stays explicit.

Frontend labels describe NEO Bank. Legacy public source registry/bridge routes are removed from the preview. Existing account identifiers and financial records are not renamed or migrated by this change.
