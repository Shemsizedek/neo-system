# NEOCAST-002 — First Original Program Pilot & Local HLS Packaging

**Parent brand:** Neofinity  
**Service:** NeoCast — broadcast distribution (distinct from NEO TV and Omnicast)  
**Dependency:** NEOCAST-001 issue #1396, draft PR #1397  
**Issue:** #1401  
**Status:** DRAFT PILOT / NO PUBLIC BROADCAST / NO NEW EXPENDITURE  
**Program proposal:** World Temple Education — original educational session (not yet scheduled)

## Actual findings and limits

The preceding NeoCast gate built a read-only official-provider discovery layer; it did not deploy a broadcasting origin. This gate prepares original programming without representing that the World Temple's material, program presenter, participants, rights, or network infrastructure have already been authorized.

The pilot manifest at `docs/neocast/pilots/world-temple-education-001.json` deliberately includes no production asset, address, media hash, schedule, signed ownership proof, distribution territory, approved operator or public endpoint. All commercial and release flags are **false**. A public GitHub repository is not an appropriate place to store unpublished private media, identity documents, contracts, releases, stream keys or passwords. Only approved *non-secret evidence references* belong in source control.

The evaluator at `services/neocast/original-pilot.mjs` reports consistency and missing requirements. It cannot verify the authenticity of a signed right, physical network capacity, or actual media playback, even when source-controlled flags are changed.

## Proposed architecture

```text
[Authorized original presentation/camera/media]
         | trusted local capture, content/participant consent
         v
[NEO-owned or licensed encoder: OBS / FFmpeg]
         | encrypted publisher-to-origin transport (future)
         v
[Persistent authorized origin: self-hosted software]
         | HLS / WebRTC packaging with tested isolation
         v
[Approved Neofinity/other network delivery and viewer endpoints]
         | bandwidth, availability, privacy, playback tests
         v
[NEO TV + NeoTube + Omnicast clients as appropriate]
```

Only the **offline encoder-to-HLS packaging test** is implemented at this gate. No streamer, uploader, RTMP server, CDN, public playback endpoint or paid service is started. No existing private network node may be presumed available.

### Portable software options (not deployed)

- **FFmpeg**: local, open-source HLS packager; its HLS muxer generates playlists and segmented media. Documentation: https://ffmpeg.org/ffmpeg-formats.html#hls-2.
- **Owncast**: candidate for a self-hosted viewer/player service after a persistent authorized host, domain/TLS, network budget and account/rights review exist. Documentation: https://owncast.online/docs/resources-requirements/.
- **MediaMTX**: alternative for authorized SRT/RTMP/WebRTC/HLS bridge, especially for flexible transport design. This is not a replacement for consent, a host or a delivery license. Documentation: https://mediamtx.org/docs/features/publish-and-read.
- The existing NEO VPN/Neofinity fabric can be used for operator transport **only after** real gateway and peer acceptance; a private tunnel alone does not create public streaming egress.

## Offline HLS smoke-test

The local script **only** generates a 4-second internal synthetic image/test tone, segments it into H.264/AAC HLS, probes outputs and removes its private temporary files. It does not read a real camera/microphone, open a network socket, serve a web page or contact any provider.

```bash
node services/neocast/original-pilot.mjs
node --test services/neocast/tests/original-pilot.test.mjs
bash services/neocast/scripts/local-hls-smoke.sh
```

Requirements for the optional local packaging test: installed `ffmpeg` and `ffprobe` with H.264/AAC encoding support. This is a portability test—not a live audiovisual performance test.

## Capacity basis (planning only)

Defaults in the manifest: **10 concurrent viewers**, average **1,500 kbps video+audio** each, **30 minutes**, origin egress reserve factor **1.3**, publisher upload reserve **1.5**.

- Direct origin-to-viewers demand: 10 × 1.5 Mbps = **15 Mbps** sustained egress (excluding protocol and adaptive variations).
- Recommended available origin uplink with reserve: **19.5 Mbps**.
- Publisher-to-origin ingest for a 1.5 Mbps program at 1.5× reserve: **2.25 Mbps**, independent from origin egress.
- Approximate delivered program bytes: 10 × 1,500 kbps × 1,800 seconds ÷ 8,000,000 = **3.375 GB** decimal.
- Transfer allowance at 1.3× reserve: **4.388 GB** decimal for this illustrative event only.

**Unknown:** real uplink capacity, origin processing, viewer traffic patterns, provider egress price/caps, transcoding load, commercial/household uplink redistribution rights and any hosting fees. These values must be measured and approved. No “free unlimited” traffic is promised.

## Actual first-broadcast acceptance runbook

1. **Rights and consent:** Approved owner/producer and operator; verify original material ownership, written rights, music/photography, speaker/guest consent, event venue authorization and territorial distribution limits. Decide and document recording/replay and potential monetization separately. NEO Law review.
2. **Identity/security:** NEO Gateway/NEOpass-approved production accounts, device permissions, publish-key rotation and incident/takedown ownership. Never put secrets in Git or public playlists.
3. **Schedule:** Pick a real future Central-time slot with ISO timestamp and explicit offset; operator and production team confirm. No default Friday event is treated as authorization for streaming.
4. **Origin:** Prove a persistent approved server/device exists, has sufficient power/uplink, valid media software, ingress restrictions, TLS and firewall policy. Verify any necessary public DNS changes only through authorized deploy gates.
5. **Dry run:** Capture an approved pilot feed, transmit to a **private** origin, prove browser/device playback from an actual independent viewer, measure packet/segment health and network demand; test denial for unapproved audience and emergency stop.
6. **Cost decision:** Show itemized monthly and event-specific internet/host/egress fees with owner permission. Approve cost or select a genuine existing no-incremental-cost path within contractual limits.
7. **Release:** Assign broadcast URL, approved publicity, recording policy, explicit operator go/no-go and evidence retention. Only then can a separately authorized production runtime mark a show as LIVE.
8. **Shutdown/reconciliation:** Confirm stream stopped, credentials rotated as needed, event analytics/incident notes reviewed, licensing restrictions applied and recordings handled according to consent.

### Required non-secret acceptance record

Store the approver role, decision time, production rights reference, event ID, signed scheduling decision, deployed origin and software version, measured bandwidth, redacted successful viewer/denied viewer proof, termination/revocation test, and final technical sign-off in an appropriately access-controlled evidence vault. **Do not** put credentials, raw identities, unapproved private media or sensitive logs into the public repository.

## Next gate

**NEOCAST-003 — Licensed pilot origin, operator playback, network capacity and real acceptance.**

Current verdict: source-level preflight and an offline synthetic encoder test may pass. Original-content rights, playback over a real network, audience isolation, public broadcasting and paid hosting remain **NOT VERIFIED / ON HOLD**.
