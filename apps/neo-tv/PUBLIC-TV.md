# NEO TV Public TV Access Roadmap

## Objective
Add lawful, one-click access to free public television without bundling unauthorized streams.

## Provider classes
- Public broadcasters
- Public, educational, and governmental (PEG) access channels
- Free-to-air / OTA tuner-backed channels
- FAST services with authorized integration paths

## Onboarding gate
A provider may be enabled only after confirming:
1. Official or otherwise authorized playback source.
2. Embed/API/playback terms permit the intended integration.
3. Geographic restrictions are represented and enforced.
4. DRM, authentication, and device restrictions are respected.
5. EPG/metadata rights are compatible with NEO TV use.
6. Source is assigned NEO integrity class GREEN or approved YELLOW.

## Architecture
Public TV Registry -> Provider Adapter -> Channel Catalog -> EPG -> NEO Player

Provider adapters may expose:
- catalog
- search
- liveChannels
- epg
- playbackRequest
- metadata
- auth when legitimately required

## Delivery sequence
### v0.6
Registry and provider classes. No third-party providers auto-enabled.

### v0.7
Verified public-provider onboarding, geographic flags, provider terms metadata, official external-player fallback, and channel discovery.

### v0.8
OTA tuner adapter, ZIP/region-aware channel discovery, EPG normalization, favorites and unified Now/Next.

### v0.9
FAST-provider adapters, account linking where required, playback capability negotiation, and cross-provider search.

## Rule
NEO TV must not scrape private feeds, bypass credentials or DRM, or rebroadcast content without authorization.
