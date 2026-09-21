# NEO Social Image Distribution v0.1

## Objective
Extend the canonical World Temple article distribution pipeline so Facebook Pages, X, LinkedIn, and TikTok receive an article image plus platform-native copy.

## Canonical event
WordPress publish success emits:
- source_post_id
- title
- canonical_url
- summary
- article_image_url
- published_at

The article remains canonical on HolyTemples.org.

## Shared image policy
Generate one clean master article cover plus platform-specific derivatives. The image carries the article title/series identity and accessible alt text. Do not silently crop title text.

## Facebook
Preferred payload: image/photo post with caption containing article title, concise synopsis, and canonical article URL.
Targets remain explicitly allow-listed. Current Meta write authorization must pass pages_read_engagement + pages_manage_posts preflight before live writes.

## X
Upload article image first, capture media_id, then create post referencing media plus concise title/article copy and canonical URL. Direct X adapter is required because the current Windsor X connector exposes identity but no write action.

## LinkedIn
Resolve authenticated member/organization identity and publishing permission first. Register/upload the article image, then create an image post with title-led commentary and canonical URL. No live LinkedIn write occurs until identity and write capability are verified.

## TikTok
Retain the merged TikTok adapter contract: vertical image post, title-first caption, approval-gated until production activation.

## Orchestration
WordPress success
 -> normalize article payload
 -> generate/resolve image derivatives
 -> platform preflight
 -> approval gate
 -> publish per destination
 -> persist receipt/post ID/status
 -> retry only failed destinations

A failure on one social network never modifies or rolls back the canonical WordPress article.

## Idempotency
Key: source_post_id + destination + account_id.
Never duplicate a successful destination on retry.

## Activation sequence
1. Facebook permission reauthorization/preflight.
2. X direct API credentials/scopes + media upload/post preflight.
3. LinkedIn OAuth identity + image-post permission preflight.
4. Resolve public article image URLs.
5. Approval-gated Paper No. 27 cross-platform test.
6. Verify every returned post identifier/status.
7. Only then promote WordPress-success distribution to automatic mode.
