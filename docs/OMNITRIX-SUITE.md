# Omnitrix Suite

Omnitrix Suite is the consumer application family for Noogle and the NEO ecosystem. It is a product architecture, not a claim that every listed service is already implemented.

## Product groups

### Search & Information
Noogle Search, Maps, Earth, Flights, Finance, Lens, Translate, News.

### Productivity & Collaboration
Neomail, Noogle Cloud, Docs, Sheets, Slides, Forms, Calendar, Keep, Meet, Chat.

### Media & Entertainment
NeoTube, NeoTube Music, NeoTube TV, Noogle Photos, Podcasts, Books.

### Platforms
Android integration, OmnitrixOS, Noogle Omnitrix browser, Noogle Play Store, Noogle TV, NEO Wear OS.

### Devices & Connectivity
Noogle Home, NeoPixel, Omnicast, NeoFit, Noogle Fi Wireless powered by NEO Wire.

### Account & Safety
Noogle Account, Noogle Neo, Noogle Pay / NEOpay, Find My Device, Authenticator, Voice / Talk, Family Link.

## Shared platform contract

Every native Omnitrix application should converge on shared NEO services for account identity, permissions, search, notifications, storage, payments and device/session management. Bitcoin/Counterparty wallet credentials remain client-controlled and must never become a general-purpose SSO password.

Apps may use public wallet addresses as account-linked identifiers, but private keys and mnemonic recovery phrases must remain isolated to wallet/signing contexts.

## Compatibility strategy

External applications may be surfaced through links, PWAs, standards-based integrations, import/export adapters or explicit APIs where technically and legally supported. Omnitrix must not imply that arbitrary third-party applications can automatically be repackaged or redistributed without their platform requirements, licenses or developer authorization.

## Delivery model

1. Suite launcher and product registry.
2. Shared Noogle Account and app navigation shell.
3. Search, News, Translate, Finance and Maps service adapters.
4. Cloud productivity data model and collaboration APIs.
5. Communications: Neomail, Chat, Meet, Voice.
6. Media services and creator platform.
7. Device, OS and smart-home integration layers.
8. Store, third-party app adapters and developer SDK.

GitHub Pages hosts static consumer surfaces. Services requiring secrets, write operations, identity verification, mail delivery, realtime communications, indexing or protected data require authenticated backend services; secrets must not be embedded in Pages JavaScript.