# CES read runtime diagnostics

Set `NEO_CES_DEBUG_ENABLED=true` in the service environment and deploy to enable redacted structured logs. The default is off; only the exact string `true` enables the mode. Set it to `false` and deploy to turn it off again.

The authenticated `GET /v1/status` response reports `debugEnabled`. Debug mode leaves bearer authentication, administrator verification, and explicit import enablement in force.

Logs contain a fixed event name, request stage, GET/POST method, numeric HTTP status when available, and elapsed milliseconds. Failure reasons come from a fixed vocabulary. Logs exclude URLs, query strings, request and response headers, HTML, raw exceptions, credentials, cookies, and database connection strings. Logging failures do not interrupt the request.

Run an authenticated `POST /v1/auth/check` to trace the member login and administrator transition without importing a report. A reachable public website does not establish that the server-side login route is reachable or that authentication succeeds.
