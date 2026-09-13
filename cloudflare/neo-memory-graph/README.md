# NEOsync Operational Memory + Executive Knowledge Graph

Private Cloudflare Access protected operational memory service for NEOsync.

## Purpose

This service turns executive context into structured entities and relationships so NEOsync can answer questions such as:

- Where did we leave off with Treasury?
- Show everything connected to Shelton Estate & Co.
- Continue the last Tribunal matter I was reviewing.
- Which active decisions are connected to Project 144?

## Data model

Entity types: PERSON, ORGANIZATION, MODULE, PROJECT, CASE, TASK, DECISION, POLICY, DOCUMENT, SYSTEM, OFFICE, EVENT.

Relationships are typed edges with optional confidence, provenance/source metadata, and arbitrary structured metadata. All changes are audit logged.

## API

- `GET /api/entities`
- `POST /api/entities`
- `POST /api/edges`
- `GET /api/search?q=...`
- `GET /api/graph/:entityId?depth=1`
- `GET /api/context?ids=a,b,c`
- `GET /api/events`

## Security

Cloudflare Access is mandatory. `ADMIN_EMAILS` may further restrict access. Machine-to-machine consumers should use Cloudflare Access service tokens or an equivalent private service binding. This service stores operational knowledge only; it does not sign wallets, move funds, execute terminals, create legal effect, or perform enforcement actions.

## NEO System integration

NEOsync uses this graph as structured operational memory. NEO Algo may rank and traverse relationships, NEO Oracle may attach provenance and confidence, GISS/NEO LMS may use approved knowledge for education, NEO Law governs authority/jurisdiction metadata, Internal NEO Society norms govern interpersonal/contextual use, N.I.A. may contribute authorized intelligence records, NEO Router routes graph requests, and NEO Lingo normalizes canonical terminology.
