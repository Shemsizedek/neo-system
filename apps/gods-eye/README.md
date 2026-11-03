# NEO God's Eye — Gate 002

Environmental observation adapter for NEO-GAS, tracked by #1313.

Upstream reviewed: bilawalsidhu/gods-eye-view at
39c648094b5acdf3ae18d00cc392136ea9af0dd1, specifically
src/data/earthquakes.js and src/layers/earthquakes/{source,records}.js.
The upstream separates USGS acquisition/normalization from globe rendering.
This implementation is independently written for NEO's provenance envelope;
no upstream code, datasets, models or dependencies are vendored.

## Usage

Run `node --test apps/gods-eye/earthquakes.test.mjs` from repository root.
Import `fetchEarthquakes` and call it explicitly from a server-side worker.
It returns observations and draft NEO-GAS indicators without writing records.
There is no route registration, background polling or automatic alert publishing.
The adapter requires Node 22+ built-in fetch and crypto; no npm install is needed.

Only the fixed HTTPS USGS all-day GeoJSON URL is requested. Redirects are
rejected, requests expire after ten seconds and response bytes are capped at
2 MiB. Failures return unavailable with no observations or credentials/errors.
Feed generation age determines freshness (five minutes by default); event time
is separate and may be older. SHA-256 covers the received UTF-8 snapshot text.
Fixtures default to simulated. A successful empty feed retains its live/stale freshness state.
Every event must have a stable ID, valid Point coordinates and event time.
No caller-supplied URL or private credentials are accepted.

NEO-GAS records remain DRAFT/LOW confidence for human source review. No status
snapshot, existing alert, readiness score, database or ledger is modified.
The functions produce data contracts, not authenticated custody attestations.

## Verification and remaining work

Five Node tests pass: fixture provenance and NEO-GAS mapping, freshness,
invalid coordinates/timestamps/duplicate IDs, fixed-source fetch/failure,
and streamed response limit. HTTP is mocked; live USGS access, provider-term
review, full repository build and deployed runtime behavior are unverified.
The supplied environment has no available environment_status tool or network
policy file; no direct upstream network test was attempted.

Next: validate generated records against the repository JSON Schema, review
provider policy/attribution, add a licensed Google-free globe UI, register the
sandbox in NEO navigation, and verify mobile rendering. Before shared/private
staging, demonstrate NEOpass session authorization and Render isolation.
No Cloudflare or Google dependency is introduced by this adapter. No globe,
authentication, live feed activation or deployment is included in this gate.

Third-party reference: https://github.com/bilawalsidhu/gods-eye-view
USGS source: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson

## Gate 003 addendum

`public/gods-eye/` adds a zero-dependency schematic SVG globe with longitude
rotation, two explicitly synthetic events, an official USGS link and downloadable
simulated draft NEO-GAS records. This is an independently implemented visual
foundation, not the upstream Cesium client. No basemap tiles, terrain, countries,
models or third-party datasets are bundled. The Global Arms panel links to
`gods-eye/` using Vite BASE_URL; public assets are served from that path by Vite.

Seven Node tests pass, including projection and adapter-record contract checks
against the existing NEO-GAS schema's current type, required, enum, minLength
and date-time keywords. The checker is scoped to those schema keywords, not a
general JSON Schema implementation. No repository schema is changed.

Browser validation was attempted but Playwright could not launch because its
Chromium executable is absent. Mobile behavior, export interaction, visual
appearance, full Vite build and navigation remain unverified. Staging/live feed
and NEOpass are still pending. This gate has no authenticated or private data.

## Gate 004: reproducible verification and staging bridge

Run `node apps/gods-eye/staging-server.mjs` for a localhost-only static sandbox.
Its fixed GET `/gods-eye/api/earthquakes` endpoint returns 503/disabled by
default. Explicitly set `GODSEYE_USGS_ENABLED=1` to permit read-only USGS
requests. Successful and unavailable snapshots are cached for 60 seconds;
concurrent callers share one in-flight request. Methods other than GET and
unregistered paths/query strings are rejected. No credentials, private records,
database writes or NEOpass sessions are involved. The current globe remains
synthetic; the API is not automatically loaded into the UI. Do not expose this
localhost bridge as an authenticated private service.

The dedicated GitHub Actions workflow runs Node tests, the full repository build,
then pinned Playwright browser checks on built assets at a GitHub Pages-style
base path. Browser checks cover mobile/desktop overflow, globe rotation, export
schema contract, simulated labels, the back link and absence of external
requests/page errors. It installs Chromium in CI rather than assuming the local
runtime has it. CI results must be inspected before claiming browser/build success.

Provider review (2026-11-03): USGS describes its GeoJSON feeds as intended for
programmatic use and updated every minute. USGS-authored data is generally U.S.
public domain, with credit requested; third-party content can retain separate
rights. This bridge uses numeric/text earthquake feed data and credits USGS;
it imports no logos, photography or third-party imagery. References:
https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits

All 11 local Node tests pass. Local Chromium and the full repository dependency checkout
are unavailable, so browser/full-build results remain pending CI. Live USGS HTTP
access was not performed here. No deployment or live data activation is claimed.

## Gate 005: visual staging feed and CI reconciliation

The globe now offers `Load staging USGS feed` and `Use demonstration` controls.
Loading is manual and same-origin, without cookies; static hosting remains a
simulation unless the separate staging bridge is explicitly enabled. Loading
clears old events; disabled/unavailable/malformed responses clear the globe and
disable exports rather than leaving synthetic points labeled live. A return to
demonstration aborts the request and invalidates late replies.

Browser-side validation checks source identity, event URL/ID, coordinates,
timestamps and source hash before rendering observations. Live observations age
to stale after five minutes. Exports preserve public-source provenance and remain
DRAFT/LOW confidence; synthetic exports remain separately labeled system data.
All data-derived labels use textContent. Exports contain only current view data.

The Gate 004 dedicated workflow completed successfully:
https://github.com/Shemsizedek/neo-system/actions/runs/41629510493
This confirms the full build and mobile/desktop browser checks at Gate 004's
commit, not this new Gate 005 implementation. Gate 005 has 13 passing local Node
tests; updated browser scenarios cover disabled-provider failure, public-feed
rendering/export and return to simulation using mocked network responses.
Live USGS network access remains unverified.

The service inventory is reconciled with verified apps-directory entries
(gods-eye and the previously omitted neo-bank-pages); the God's Eye static route
is added to the canonical Pages registry. Existing hosting-plane policy is not
changed. The broader CI run also failed an unrelated school test expecting
“Global Interdependent School District” while the page says “Global Interdependent
School System” (server/neo-platform-api/server.test.mjs:37). That failure remains
an explicit release blocker; this gate does not rewrite school naming or tests.
