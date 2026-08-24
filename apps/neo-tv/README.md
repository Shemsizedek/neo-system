# NEO TV Hub

**NEO TV — The Open Entertainment Operating System**

NEO TV Hub is the entertainment module of the NEO System. The v0.1 Origin milestone establishes a TV-first GitHub Pages front end and a GitHub-backed manifest layer for future services.

## Current v0.1 modules

- NEO Live
- NEO Cinema
- NEO Music
- NEO Games
- NEO Gallery
- NEO Add-ons
- NEO Media Vault
- NEOsync Entertainment Intelligence

## Architecture

```text
GitHub Pages UI
      |
      v
NEO TV Core / manifests
      |
      +-- provider adapters
      +-- media catalog
      +-- add-on manifests
      +-- EPG/PVR services
      +-- NEOsync orchestration
      +-- NEO ecosystem integrations
```

GitHub is the primary source-control and configuration backend. GitHub Pages hosts the public static shell. Stateful playback services, account data, EPG ingestion, DVR workloads, transcoding, payment functions and private credentials must run on dedicated service infrastructure when those layers are introduced; they must not be treated as capabilities of GitHub Pages itself.

## Content integrity

The official NEO TV distribution path uses a three-tier source model:

- **GREEN** — authorized, licensed, public-domain, user-owned or official APIs.
- **YELLOW** — user-provided/external source requiring verification.
- **RED** — piracy, credential theft, DRM circumvention, malware or known unauthorized distribution.

RED sources are not distributed through official NEO TV repositories.

## Pages target

`https://shemsizedek.github.io/neo-system/neo-tv/`

## Next build layer

1. Replace prototype module alerts with SPA routing and module views.
2. Add a schema-driven media catalog and add-on manifest registry.
3. Define the provider adapter API for legal IPTV/FAST/OTA services.
4. Add EPG data model and PVR/DVR service contracts.
5. Connect NEOsync search/orchestration through a secure service boundary.
6. Add installable PWA metadata and remote-control architecture.
