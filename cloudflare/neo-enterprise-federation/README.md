# NEO Enterprise Command Federation

This Worker is a private read-only federation bridge between the NEO Government Executive Console and the NEO Enterprise organization store.

## Purpose

The Government console can inspect consolidated enterprise health without exposing the Government control plane to Enterprise users and without exposing raw organization administration publicly.

The federation reports:

- organization health
- member, wallet and terminal counts
- pending enterprise approvals
- terminal attention states
- consolidated NEO Books inflow, outflow and net summaries
- recent enterprise audit events

## Security

- `MODULE_ADAPTER_TOKEN` is required for every federation data request.
- `/health` exposes service health only.
- The Worker binds directly to the `EnterpriseStore` Durable Object exported by the `neo-enterprise` Worker.
- Federation endpoints are read-only in v1. Executive decisions remain inside the authenticated Enterprise workspace.

## Required configuration

Set the same `MODULE_ADAPTER_TOKEN` secret on both:

- `neo-government`
- `neo-enterprise-federation`

Set this variable on `neo-government`:

- `ENTERPRISE_FEDERATION_URL=https://neo-enterprise-federation.<your-workers-domain>`

## Routes

- `GET /health`
- `GET /summary` — bearer token required
- `GET /organizations/:id` — bearer token required
