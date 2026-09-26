# NOUS-RUDWAAN-005 — Instagram Account Binding & Smoke Test

## Bound account
- Agent: NIA-013 / RUDWAAN
- Connector: instagram
- Account: shemsizedek
- Account ID: 17841404189884314

## Verified capabilities
- reply_to_comment
- create_comment
- create_image_post
- create_video_post
- create_story
- create_carousel_post

## Runtime status
ready_for_smoke_test

## Smoke test
Use a public post on the Shemsizedek Instagram account.

1. From another Instagram account, add a comment:
   `Rudwaan, what is Noology?`
2. Capture the resulting Instagram comment ID and media ID through the connected Instagram read/event path.
3. Normalize the event into `src/social/rudwaan-instagram-transport.mjs`.
4. Route it into Nous OS through `src/social/rudwaan-nous-bridge.mjs`.
5. Reply via the Instagram connector's `reply_to_comment` action.
6. Record the provider receipt.
7. Confirm that no privileged capability is reachable from the public surface.

## Boundary
The current connected provider exposes public comment write actions but does not expose DM ingestion or Meta AI Studio character chat delivery. Therefore this smoke test validates the supported public interaction lane only.
