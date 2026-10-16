# NEO Deal Desk — Render Proxy

This service provides the Render-hosted front door for `desk.holytemples.org`.

It does **not** reimplement authentication or data persistence. It reverse-proxies the existing NEO eGov / NEopass backend so:
- the browser stays on `desk.holytemples.org`;
- `/portal` resolves to `/portal/deal-desk`;
- NEOpass login/session cookies remain first-party on the Deal Desk host;
- executive-admin authorization remains enforced by the upstream NEO Platform API;
- CRM, Firestore and Deal Desk runtime stay authoritative upstream.

Runtime:
- Start: `node deploy/deal-desk-render/server.mjs`
- Health: `/healthz`
- Default origin: `https://egov.holytemples.org`
- Public host: `desk.holytemples.org`
