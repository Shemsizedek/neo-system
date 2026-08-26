# NEOsync Executive Inbox

Private Government-side executive workstream for NEO Systems.

## Purpose

The Executive Inbox consolidates attention items from multiple private control-plane sources into one authenticated queue rather than forcing executive users to inspect separate dashboards.

Current sources:

- Government module states in REVIEW or HOLD.
- Attention-class Government records such as review, approval, incident, filing, case, treasury, or urgent records.
- Enterprise pending approvals, including due-soon and escalated approvals from Enterprise Federation.
- Infrastructure health for Enterprise Federation, Escalation Desk, Tribunal, Router, and NEOsync when configured.

## Executive workflow

Each synthesized item has a durable local disposition:

- OPEN
- ACKNOWLEDGED
- RESOLVED

Changing disposition does not mutate the underlying Tribunal, Enterprise, Treasury, Router, or other source record. It records executive handling state for the unified inbox only.

## Security

Cloudflare Access is mandatory. Optional `ADMIN_EMAILS` restricts the authenticated audience further. The browser never receives `MODULE_ADAPTER_TOKEN`. Enterprise Federation is called server-side. The Government Durable Object is bound directly by script/class binding.

No wallet signing, payments, transfers, terminal execution, policing, legal enforcement, or coercive action is exposed by this inbox.

## Required configuration

Secrets / variables:

- `ACCESS_TEAM_DOMAIN`
- `ACCESS_AUD`
- `ADMIN_EMAILS` (recommended)
- `MODULE_ADAPTER_TOKEN`
- `ENTERPRISE_FEDERATION_URL`
- `ESCALATION_DESK_URL` (optional health source)
- `TRIBUNAL_API_URL` (optional health source)
- `ROUTER_API_URL` (optional health source)
- `NEOSYNC_API_URL` (optional health source)

Set `EXECUTIVE_INBOX_URL` on `neo-government` after deployment so the Government Module Adapter Fabric reports the Inbox as LIVE.
