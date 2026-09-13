# NEO TV — Canonical NEO System Integration

Status: Production track
Version: 1.0 gateway

NEO TV is the consumer entertainment operating system of the NEO System.

## Integration map
- NEO Algo: ranking, search, recommendations, channel/program decision logic.
- NEO Oracle: verified provider knowledge, metadata provenance, program/source intelligence.
- GISS NEO LMS: educational channels, lectures, courses, public-media learning playlists.
- NEOsync (Digital Etheric Intelligence): natural-language entertainment orchestration, discovery, watch/record intents, profile-aware assistance.
- NEO Law: content rights, provider terms, geographic restrictions, licensing, privacy, parental controls, advertising/commercial compliance.
- Internal NEO Society: community/watch-party norms, creator/channel conduct, age-appropriate participation, moderation standards.
- NEO Gateway: authenticated service boundary for future server-side provider adapters and protected operations.
- NEO Router: routes media discovery and provider requests to authorized adapters.
- NEO Lingo/Lexicon: normalizes channel, program, genre, provider, rating and rights terminology.
- N.I.A./NEO Crawler: may discover public/authorized metadata and provider changes with provenance; it must not ingest unauthorized private streams.
- NEO Lifestyle / Creator Media: NEO Originals, creator channels, programming, promotions and distribution.
- NEO Pay / commerce: future subscriptions, PPV, creator support and purchases only through compliant server-side services.

## Production rule
The public frontend exposes consumer-facing catalog and launch/playback controls only. Secrets, credentials, private API keys, internal service topology, privileged endpoints, custody/payment logic and administrative wiring must remain server-side behind authenticated NEO Gateway services.

## Provider modes
1. direct-authorized: NEO TV may play a documented authorized direct media source.
2. official-player: NEO TV launches the provider's official player when embedding/direct playback rights are not established.
3. authenticated-adapter: future server-side provider integration requiring user/provider authentication.
4. tuner: future OTA/home tuner adapter.

## Rights rule
No credential bypass, DRM circumvention, scraped private feed, unauthorized rebroadcast, or piracy add-on is part of official NEO TV production.
