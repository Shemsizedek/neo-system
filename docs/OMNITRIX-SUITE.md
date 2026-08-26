# Omnitrix Suite

Omnitrix Suite is the consumer application family for Noogle and the NEO ecosystem.

## Shared identity boundary

Noogle Account is the shared application profile layer for consumer services. Bitcoin/Counterparty private keys, WIFs and mnemonic recovery phrases are wallet-only credentials and must never be repurposed as general suite passwords. Public wallet addresses may be linked to an account, but signing secrets remain isolated to NEOpay and explicit signing contexts.

The GitHub Pages implementation currently stores a minimal display profile on the user's device. Production multi-device identity requires an authenticated backend and should add passkeys/WebAuthn, recovery controls, device/session management and explicit privacy settings.

## Initial live service adapters

- Noogle Search: shared search UI with an optional independent Noogle crawler API (`<api-base>/search?q=`). Until that crawler is deployed, the public knowledge fallback uses Wikipedia search and clearly identifies that boundary.
- Noogle News: provider-neutral news surface; first live public feed adapter is Hacker News while the NEO news aggregation/index backend is developed.
- Noogle Translate: provider-neutral translation surface; first public adapter uses MyMemory and can be replaced by a NEO-hosted translation service.
- Noogle Finance: live public BTC/XCP price adapter plus links into NEO Prime and NEOpay. NOMNI/NEOfx pricing remains a distinct NEO market-data concern.
- Noogle Maps: live place search via OpenStreetMap/Nominatim and map rendering via OpenStreetMap embed.

## Full suite registry

Search & Information: Search, Maps, Earth, Flights, Finance, Lens, Translate, News.

Productivity & Collaboration: Neomail, Cloud, Docs, Sheets, Slides, Forms, Calendar, Keep, Meet, Chat.

Media: NeoTube, NeoTube Music, NeoTube TV, Photos, Podcasts, Books.

Platforms: Android integration, OmnitrixOS, Omnitrix browser, Play Store, Noogle TV, NEO Wear OS.

Devices & Connectivity: Noogle Home, NeoPixel, Omnicast, NeoFit, Noogle Fi Wireless / NEO Wire.

Account & Safety: Noogle Account, Noogle Neo, NEOpay, Find My Device, Authenticator, Voice/Talk, Family Link.

## Backend rule

GitHub Pages hosts static consumer surfaces only. Mail delivery, cloud storage, collaboration, protected search indexing, identity verification, realtime communications, notifications and any API secrets require authenticated backend services. No secret keys belong in Pages JavaScript.