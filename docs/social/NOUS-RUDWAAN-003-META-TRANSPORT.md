# NOUS-RUDWAAN-003 — Meta / Instagram Transport Binding

## Status
Implemented in source as a fail-closed public interaction adapter.

## Verified connected-provider capability
The current Instagram connector exposes:
- create image post
- create carousel post
- create story
- create video post
- create comment
- reply to comment
- hide/unhide/delete comment

The current connector does not expose:
- Instagram DM ingestion
- AI Studio character chat events
- an external backend/tool hook for an existing AI Studio character

Therefore the production-safe first transport lane is:

Instagram public comment event -> Rudwaan -> Nous OS -> approved public reply -> Instagram reply receipt

## Runtime contract
`src/social/rudwaan-instagram-transport.mjs`

The adapter intentionally requires two injected runtime functions:
- `queryNous(envelope)`
- `replyToComment({commentId,message})`

Inbound request authentication is also injected via `verifyRequest`; unsigned traffic is rejected.

## Public endpoint contract
- `GET /health`
- `POST /instagram/rudwaan/events`

A hosting runtime must map a verified Instagram comment event into:

```json
{
  "mediaId": "instagram-media-id",
  "userId": "instagram-user-id",
  "commentId": "instagram-comment-id",
  "message": "public comment text",
  "username": "optional"
}
```

## Explicit boundary
This does not claim that Meta AI Studio currently forwards Rudwaan character chats into Nous OS. Meta announced on August 10, 2026 that existing characters remain active while creation/editing is being retired/upgraded; no general public custom-character backend hook has been identified.

The bridge is ready for a future DM/character ingress provider without changing Rudwaan's authority model.
