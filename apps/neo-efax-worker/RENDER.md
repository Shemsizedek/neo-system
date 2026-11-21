# NEO-EFAX-007: Render alternative

Cloudflare is not required. Render free-tier staging is proposed, subject to current account eligibility and limits; no service has been created or deployed. The existing Worker fetch handler is reused through a Node HTTP adapter.

Health: GET /health. Fax submission: POST /fax/send returns HTTP 503; no fax carrier, document storage, or Neon migrations. Run `npm test` in this directory. Do not connect IRS documents or secrets until authentication and secure job handling are implemented.

The Render account connector was not accessible during this gate; a linked Render account is required to provision or verify deployment. Keep Cloudflare config as legacy only; do not deploy it.
