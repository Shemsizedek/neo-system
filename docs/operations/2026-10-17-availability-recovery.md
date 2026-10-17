# Public availability recovery — 17 October 2026

## Confirmed causes

- Google Cloud deployment run 38935258332 failed with `BILLING_DISABLED`; the shared public edge, its direct origin and the eGovernment hostname returned HTTP 503.
- The Render `neo-system` web service failed because its configured start command is `Yarn start`: the shell reports `Yarn: command not found`.
- The Render static React recovery site returned HTML 200 while both JavaScript and CSS returned 404. It used the GitHub Pages `/neo-system/` asset prefix at a root-hosted domain.

## Applied recovery

- Vite now uses `/` on Render and preserves `/neo-system/` on GitHub Pages. A Render-mode production build and deployed JS/CSS requests passed.
- A public Sites Worker publishes the existing Temple Portal landing page and scripts, the NEO workspace, Hub, public library snapshots and the existing WordPress bridge assets independently of the disabled Google project.
- New primary host: https://temple-continuity.shemsizedek.chatgpt.site
- Sites project: `appgprj_6ad38d35ba0881919fb413bbe06b3002`.
- Canonical hostnames being connected: `egov.holytemples.org`, `neo.holytemples.org`, `hub.holytemples.org`.
- Member requests use the existing Render platform recovery runtime. They retain cookies, authentication and error responses, are never cached, and return 503 on dependency failure. No member data or credentials were copied into the public Worker.

Domain connection is complete only when Sites reports active TLS and public HTTPS requests return the expected page and assets. DNS caches may retain old records for their previous TTL of 3600 seconds. Record the final validation separately; do not equate submitted DNS changes with restored service.

## Remaining dependencies

1. Restore Google project billing to recover Google-hosted APIs, Firestore-backed member records and other services. This session has no Google billing identity. Rebuilding the frontend cannot restore those data services.
2. Correct the Render service start command in https://dashboard.render.com/web/srv-db8be4u89jmc73cu2s3g/settings to the intended server entrypoint, rather than `Yarn start`. For the existing NEO edge source this is `node server/neo-edge/production.mjs`. Validate dependencies and configure the intended backend origins before directing production traffic there. The available connector cannot edit that field.
3. The existing Render platform recovery API is on a free plan and can sleep. Continuous backend availability requires an appropriately sized always-on plan and durable, recovered storage. Public Worker pages do not depend on that process being awake.
4. Other Google-hosted subdomains are not migrated by the first three host connections. Audit and migrate each service with its persistence, authentication and external integrations before changing its DNS.

## Monitoring and AdSense

`Public Website Availability` runs on requested dispatch, relevant pushes and a ten-minute GitHub Actions schedule. It checks expected page content, JS/CSS bodies and the root site's AdSense script, publisher record and robots rules. Failures remain failures and reports are retained for 14 days. GitHub schedules may be delayed; this is detection, not automatic failover or an uptime SLA. Configure repository Actions notifications for the responsible operators.

The WordPress root, mail records, AdSense script and publisher ID were preserved. The root homepage, robots.txt and ads.txt were reachable and the existing publisher ID matched during inspection. Technical availability does not imply AdSense approval.

## Rollback records

Only the named service DNS records were replaced. The previous eGovernment CNAME was `ghs.googlehosted.com.` (TTL 3600). The previous NEO and Hub A records were `8.232.127.249` (TTL 3600). Restore them only after Google hosting and TLS have been independently verified healthy. Preserve all apex, mail and unrelated service records.
