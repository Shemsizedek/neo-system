# CES read runtime diagnostics

Set `NEO_CES_DEBUG_ENABLED=true` in the service environment and deploy to enable redacted structured logs. The default is off; only the exact string `true` enables the mode. Set it to `false` and deploy to turn it off again.

The authenticated `GET /v1/status` response reports `debugEnabled`. Debug mode leaves bearer authentication, administrator verification, and explicit import enablement in force.

Logs contain a fixed event name, request stage, GET/POST method, numeric HTTP status when available, and elapsed milliseconds. Failure reasons come from a fixed vocabulary. Logs exclude URLs, query strings, request and response headers, HTML, raw exceptions, credentials, cookies, and database connection strings. Logging failures do not interrupt the request.

Run an authenticated `POST /v1/auth/check` to trace the member login and administrator transition without importing a report. A reachable public website does not establish that the server-side login route is reachable or that authentication succeeds.

For a bank backend, configure a separate `NEO_CES_BACKEND_TOKEN`. This token permits only `GET /v1/status`, `GET /v1/reports/trading/latest`, and `POST /v1/auth/check`. It cannot collect/import, enumerate imports, or perform financial actions. Keep the controller token separate. The cached-report endpoint returns a validated historical report without making a new upstream login; it returns 404 until a source batch exists.
