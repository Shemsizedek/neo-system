# NEOTHERAPY-API-001

This adapter exposes the Neotherapy domain boundary through the repository's existing serverless API convention.

## Current storage truth
The runtime store is **ephemeral**, not durable. It is suitable for integration validation only. The status endpoint reports `persistent: false` so the UI and operators cannot mistake it for production persistence.

## Endpoints
`GET /api/neotherapy?action=status`
`POST /api/neotherapy?action=consent`
`POST /api/neotherapy?action=credential`
`POST /api/neotherapy?action=authorize`
`POST /api/neotherapy?action=session`

A durable database adapter remains the next storage gate.
