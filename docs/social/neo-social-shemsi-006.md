# NEO-SOCIAL-SHEMSI-006 — Instagram Approval Bridge + Operator Notifications

This gate expands Shemsi beyond polling-only sources without weakening the human approval boundary.

## Instagram

NEO already contains a Rudwaan Instagram transport that normalizes verified public comment events. SHEMSI-006 reuses that verified inbound event contract and forwards it into the Shemsi queue through:

`POST /automation/shemsi/instagram-event`

The route is protected by the existing NEO Social automation bearer token. It is intended for already-authenticated internal connector delivery, not as a raw unauthenticated Meta webhook endpoint.

A verified Instagram comment becomes:

```
Rudwaan verified event
 -> deterministic Shemsi inbox item
 -> create-only dedupe
 -> durable approval notice
 -> Discord operator notification
 -> human review
 -> draft
 -> explicit approval
 -> publish adapter
 -> receipt / readback
```

SHEMSI-006 does **not** call Rudwaan's automatic reply path.

## Discord approval notifications

New approval notices can notify the configured NEO Discord channel using:

- `SHEMSI_DISCORD_WEBHOOK_URL`, or
- existing `DISCORD_WEBHOOK_URL` as a deployment fallback.

Notifications contain only:
- platform;
- priority;
- bounded comment text;
- link to the Shemsi review console.

Discord mentions are disabled.

Notification failure never auto-approves, auto-publishes, or drops the durable approval notice.

## Production configuration

- `SHEMSI_INSTAGRAM_ACCOUNT_ID` — authorized Instagram Business/Creator account ID bound to the Rudwaan transport.
- `SHEMSI_DISCORD_WEBHOOK_URL` — optional dedicated approval-notification webhook.

The Cloud Run deployment syncs the webhook into Google Secret Manager when configured.

## Platform boundary

LinkedIn and YouTube remain the polling/readback sources from SHEMSI-004/005.

Instagram now has an internal verified-event ingestion bridge.

TikTok public comment querying is not wired into the engagement lane because the currently documented comment-query surface is Research Tools access rather than a normal creator/business comment-management API.

X and Facebook remain fail-closed until a repository connector or official API contract for the required comment-read/reply capability is explicitly verified.

## Next gate

**NEO-SOCIAL-SHEMSI-007** — approval-center UI, priority filtering, notification acknowledgement, and connector-health dashboard.
