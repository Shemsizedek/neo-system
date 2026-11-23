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
Fixtures default to simulated. A successful empty feed returns empty.
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
