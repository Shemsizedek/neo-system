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

Domain connection is complete only when Sites reports active TLS and public HTTPS requests return the expected page and assets. DNS caches may retain old records for their previous TTL of 3600 seconds.

### Verified result

All three custom domains reached `active` status with active TLS. The public availability workflow, run [39044485314](https://github.com/Shemsizedek/neo-system/actions/runs/39044485314), passed on its second attempt after domain activation. The Temple portal and its JavaScript, NEO workspace, Hub, Render React recovery page and its JS/CSS, and the WordPress AdSense technical prerequisites all passed. Unauthenticated member requests remain subject to the existing backend's authorization. This result establishes public-site recovery, not restoration of the disabled Google database or a successful member login.

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

## City and University migration

The next published batch restores the existing public City and University content from their WordPress origins, independently of the failed Google entrypoints. Sites source commit `b0b1b6baebce6aaa95c9f94d8cc0c24047440ddd`, saved version 3, deployment `appgdep_6ad3bce634748191b3272a2fd0f092f0` succeeded.

- `city.holytemples.org`: public origin `https://nuuniversitytxdot.wordpress.com`.
- `university.holytemples.org`: public origin `https://nuuniversitydot.wordpress.com`, landing path `/the-nu-univ-system/`.
- Root pages use captured public HTML. Other public pages/assets use fixed-origin GET/HEAD forwarding. Cookies and authorization are never forwarded, response cookies are removed, and member/admin/write routes remain unavailable.
- DNS CNAME and verification TXT records were applied for these two subdomains only. Previous City DNS TTL was 3600 seconds; University was 300 seconds.
- Local checks passed for content, HEAD, write rejection and credential isolation, alongside all five existing gateway tests.
- Sites accepts a maximum of five custom domains per project. This project now has five; subsequent failed subdomains require separate project groups.

There were 41 failed subdomain entrypoints in the remaining-site audit before this batch. This migration does not restore Google-hosted private databases, payments, account operations or every remaining subdomain.

## Community public-site migration

The next batch publishes five public entrypoints on independent Sites hosting:

- Office: `office.holytemples.org`, preserving the public Shelton Estate & Co / Global Religious Family Office page from `https://sheltonestate.family.blog/`.
- World Leaders Forum: `leaders.holytemples.org`, preserving its existing home, About, Parliament, Leadership and Contact pages.
- Neoteric Method: `neoteric.holytemples.org`, preserving the existing public Neoteric Method page.
- Society: `society.holytemples.org`, preserving the existing 302 redirect to `https://neo.dnnr.io/`.
- Lifestyle: `lifestyle.holytemples.org`, preserving the existing 302 redirect to `https://neo.dnnr.io/neo/ambassador-application`.

Sites project: `appgprj_6ad3be70093c819181658e0f39c43876`. Public deployment: https://temple-community.shemsizedek.chatgpt.site. Source commit: `a0427b444a683213517010c666c462cb741a079e`. Deployment: `appgdep_6ad3bed1bf0481918d81085c4fbb3c6d` (succeeded).

Only these five failed subdomains' address records and their ownership/TLS verification records were changed. Each previous address record had a 300-second TTL. The original Google endpoints all returned 503 before migration; both external community destination pages returned 200. Existing root and mail records are preserved.

Public Office root content is a versioned snapshot; other public Office pages/assets use a fixed WordPress origin. Upstream cookies are removed, visitors' session credentials are not forwarded, and private/admin/write routes return unavailable. Leaders and Neoteric pages are independent of sleeping backend processes. No private account data, payment services, checkout flows or authenticated community workflows are restored or validated by this batch.

Five gateway tests passed: root/subpage content without origin access, HEAD behavior, established community redirect paths/queries, rejected writes/private routes, and fixed-origin session isolation/redirect rewriting. The availability monitor checks the five additional custom domains; Office assets and exact community redirect destinations are included.
