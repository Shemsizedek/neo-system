# NEO Social — Windsor Organic Adapter v0.1

## Purpose

This adapter defines the connected-provider execution path used when an authenticated Windsor.ai organic-social connector is already available in ChatGPT.

It is additive. Existing direct Facebook and LinkedIn API clients remain valid fallback/server-runtime paths.

## Runtime model

The Windsor route is an **operator-connected provider path**, not a repository-secret path.

When used from ChatGPT:

1. Read the canonical campaign manifest.
2. Resolve a connected account from the provider connector.
3. Resolve the provider's supported write action.
4. Execute the write only after explicit user authorization.
5. Normalize the result into the NEO Social receipt model.
6. If the provider reports success but does not return a post identifier, record the state as `submitted`, not `published`.
7. Attempt provider readback/permalink verification separately.

## Provider mapping

- Facebook organic image posts: `facebook_organic.create_photo_post`
- LinkedIn organic image posts: `linkedin_organic.create_image_post`
- X organic: connected account available; action support must be checked at execution time.
- YouTube Community: remains browser/UI handoff until a supported write action exists.

## Failover order

Facebook and LinkedIn prefer the authenticated connected-provider route when it is available. The existing repository direct-API clients remain the fallback path.

This removes GitHub Actions secrets as a single point of failure without deleting or weakening the direct platform integrations.

## Receipt discipline

A connector call that returns success but no provider post ID is **submitted**. It must not be upgraded to **published** until a post ID or permalink is obtained through provider output or readback.

A provider response containing a platform post/share identifier may be recorded as **published**.

## NOMNI-TECH-001 execution

The first live use of this path published/submitted the canonical NOMNI-TECH-001 image campaign to four connected Facebook Pages and two connected LinkedIn company pages. See the campaign receipt ledger for exact status.
