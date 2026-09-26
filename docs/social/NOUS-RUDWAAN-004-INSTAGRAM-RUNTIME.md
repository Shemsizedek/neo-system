# NOUS-RUDWAAN-004 — Instagram Runtime Activation

## Purpose
Bind Rudwaan (NIA-013) to an actually authorized Instagram Business/Creator account before enabling public comment-reply execution.

## Live connector state at implementation
Connector: `instagram`

Available write actions:
- create carousel post
- create comment
- create image post
- create story
- create video post
- delete comment
- hide comment
- reply to comment
- unhide comment

Current account list: empty.

Therefore runtime activation remains fail closed until OAuth authorization returns at least one Instagram account identity.

## Activation gate
`src/social/rudwaan-instagram-runtime.mjs`

The runtime is ready only when:
1. an Instagram account id is present, and
2. `reply_to_comment` is supported.

No fallback account id may be guessed or hard-coded.

## OAuth path
The connected provider reports an OAuth authorization flow for the Instagram connector. Once completed, re-run the connector health check and bind the returned account id to NIA-013.

## Smoke test after authorization
1. Publish or select a public Instagram post.
2. Add a test comment from another account, e.g. "Rudwaan, what is Noology?"
3. Deliver the verified comment event into the Rudwaan transport.
4. Confirm Nous OS returns a public-safe answer.
5. Confirm Instagram reply receipt contains success and a provider/platform identifier when returned.
6. Confirm no privileged actions are available through the public surface.
