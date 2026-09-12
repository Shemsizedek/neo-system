# NEO Bot Military

Authorized digital-operations framework for NEO System social channels.

## Mission

Operate a measurable, auditable social-media automation layer using accounts and data the operator is authorized to control. The system is designed for account integrity, analytics, publishing support, legitimate audience development, and incident evidence preservation.

## Command structure

- **Joint Command / NEOsync** — orchestration, permissions, audit logs, human approval gates.
- **Army / Distribution Corps** — authorized scheduling, cross-posting, campaign execution, SEO metadata, experiments.
- **Navy / Intelligence Fleet** — public mention, trend, platform-status and traffic-anomaly monitoring.
- **Marines / Rapid Response Corps** — triage of priority mentions, support incidents and time-sensitive opportunities; consequential public responses require approval.
- **Air Force / Reach & Media Corps** — creative variants, short-form optimization, thumbnails, hooks and legitimate paid-media experiments.
- **Space Force / Analytics & Recon** — cross-platform telemetry from impressions through conversion and anomaly detection.
- **Cyber Command / Account Integrity** — follower-count snapshots, suspicious engagement evidence, platform restrictions, monetization flags, impersonation and phishing incidents.

## Rules of engagement

1. Only operate accounts/data for which the operator has authorization.
2. No fake personas, sockpuppets, purchased followers, artificial views, mass follow/unfollow, automated fake comments, or engagement manipulation.
3. Prefer official platform APIs and exported first-party analytics.
4. Read-only collection is the default. Publishing or account mutations require explicit authorization and platform-compliant credentials.
5. Preserve source, timestamp and evidence provenance. A heuristic flag is not proof of malicious activity.
6. Do not automatically block/report users based solely on a score. Queue evidence for human review.
7. Never store platform passwords in the repository. Use the existing NEO secrets/identity infrastructure.

## Operation CLEAN SIGNAL — Phase 0

Initial target: Instagram `@Shemsizedek`.

Known baseline supplied by the operator on 2026-09-04:

- Followers: 2,708
- 90-day views: 22,030
- 90-day viewers: 4,554
- 90-day interactions: 1,130
- 90-day net follower change: +63
- Non-follower share of 90-day views: 37.8%
- Platform-state anomaly: historical `Ineligible country or region` monetization restriction while a current eligibility screen recognizes U.S. residence.

These are operator-supplied observations/evidence, not conclusions about causation.

## v0.1 data model

Each daily snapshot should record:

```json
{
  "platform": "instagram",
  "account": "shemsizedek",
  "observed_at": "ISO-8601",
  "followers": 2708,
  "views": null,
  "reach": null,
  "interactions": null,
  "non_follower_view_pct": null,
  "account_status": [],
  "evidence_refs": [],
  "source": "manual|official_api|first_party_export"
}
```

Each incident should record `incident_id`, timestamp, type, account/user involved, operator statement, evidence references, confidence, and disposition. Keep `firsthand_observation`, `platform_record`, and `inference` separate.

## First implementation gate

Build **Cyber Command / Account Integrity** first:

1. SQLite tables for account snapshots, follower incidents, suspicious-viewer observations, platform restrictions, and evidence references.
2. Authenticated internal HTTP endpoints to submit/read snapshots and incidents.
3. An anomaly detector operating on longitudinal counts; it must describe statistical deviations without asserting deliberate suppression.
4. Tests proving unauthorized requests fail, evidence provenance is retained, and no social-platform write action exists.
5. Payout, custody, fake-engagement and autonomous account-mutation functionality are explicitly out of scope.

This directory is the source-of-truth entry point for NEO Bot Military v0.1.