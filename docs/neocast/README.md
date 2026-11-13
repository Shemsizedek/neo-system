# NEOCAST-001 — Authorized Media Launch and Broadcast Distribution Foundation

**Parent brand:** Neofinity (not "Neofinity Internet")
**Service:** NeoCast (media/broadcast distribution)
**Existing systems reused:** NEO TV, NeoTube, Omnicast, NEOsync, NEO Law, NEO Gateway
**State:** READ-ONLY DISCOVERY / NO NEOCAST BROADCAST ORIGIN LIVE / NO NEW SPEND

## Purpose and product boundaries

NeoCast is the proposed media distribution/coordination layer within Neofinity. Neofinity provides transport and network service architecture. NeoCast coordinates authorized broadcast distribution. NEO TV is the viewing hub; NeoTube is video/creator media; **Omnicast** is the device casting experience. They are not renamed or replaced.

The first gate uses official external player launch only for providers already listed in the canonical docs/neo-tv/data/public-tv-providers.json. The NEO TV provider registry is the source of record for the provider name, classification, territory and official URL. The separately reviewed host allowlist at docs/neocast/approved-origins.json determines whether NeoCast may generate a navigation link.

Live status in the NEO TV registry means the source is registered. It does not establish a continuously available external stream, a NEO-owned broadcast, a right to embed, or a rebroadcast license. NeoCast labels these links "official player" and opens provider-operated destinations.

## Implementation files

- services/neocast/discovery.mjs: read-only plan generation and URL launch intent; never fetches a live stream or controls a player.
- services/neocast/tests/discovery.test.mjs: verify no rights bypass or false live-origin claims.
- docs/neocast/approved-origins.json: public-safe allowlist of reviewed external official hostnames.
- docs/neocast/index.html: static discovery page; loads source and policy from same-host JSON and constructs safe navigation links.
- docs/neo-tv/index.html: simple link to NeoCast discovery; existing playback and profiles unchanged.
- .github/workflows/neocast-001.yml: read-only build/test checks, no deployment credentials.

## Proof / local checks

From repository root, run:

    node --check services/neocast/discovery.mjs
    node --test services/neocast/tests/discovery.test.mjs
    node services/neocast/discovery.mjs

Expected: two external official provider launch entries from current repo seed (NASA+, PBS), zero NeoCast broadcast-origin proof, no stream URLs and no proxying. Tests do not contact providers to check reachability, stream state, geoblocking or external legal permissions.

## Control gates for any NeoCast-owned stream

1. Content owner, distribution rights, geographic reach, permitted platforms and recording consent documented; NEO Law review.
2. Real NEO-owned or explicitly licensed origin exists; access boundaries and operator identities verified via NEO Gateway; approved schedule and event ID.
3. Permitted ingest/encoding/packaging/manifest delivery tested end-to-end. Hosting or adaptive bitrate requires real resources and budget approval.
4. Rights-aware CDN/edge/backhaul contracts reviewed. No unlicensed capture, third-party rebroadcast, geo-bypass, DRM circumvention or upload endpoint before launch authorization.
5. Monitoring, abuse handling, latency/bandwidth measurements, backup ingest, takedown and cancellation tested in a controlled pilot.
6. NEOsync may coordinate only after operator clearance; no silent broadcasts, payments or content resale.

## Next gate

**NEOCAST-002:** approved original-content pilot (World Temple education or other owned/authorized production) with rights manifest, origin specification, owner/operator approvals, bandwidth planning, and no-cost or approved-cost deployment decision. An actual broadcast remains NOT LIVE until real end-to-end evidence is recorded.

**Budget policy:** zero new paid accounts, subscriptions, bandwidth purchases, hardware orders, DNS changes or production deployment in NEOCAST-001.
