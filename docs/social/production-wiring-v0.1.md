# NEO Social Production Wiring v0.1

Status: implementation gate; live publishing remains approval-gated.

## Important correction
Generated concept artwork is not evidence that credentials, CDN hosting, or social publication succeeded. Production status is established only by API/preflight results.

## Article image manifest
For each successfully published WordPress article:
- source_post_id
- title
- canonical_url
- summary
- master_image_url
- facebook_image_url
- x_image_url
- linkedin_image_url
- tiktok_image_url
- alt_text
- content_hash

No destination may publish until its required image URL/media upload resolves successfully.

## Platform gates
### Facebook
Require Page identity, Page access token, pages_read_engagement, pages_manage_posts, then photo-post preflight. Previous error #200 remains blocking until reauthorization proves these permissions.

### X
Require authenticated NEO X adapter runtime, media upload success, media_id, then post creation. Never fall back to a text-only post after image upload failure.

### LinkedIn
Require authenticated member/organization URN, approved write scope, initialize image upload, binary upload success, image URN, then post creation.

### TikTok
Require creator-info query, permitted privacy level, verified public image URL/domain, and Content Posting API eligibility before init.

## Orchestration state
PENDING_IMAGE -> PREFLIGHT -> APPROVED -> PUBLISHING -> VERIFIED
Failures enter FAILED_<DESTINATION> and do not roll back WordPress or successful destinations.

## Promotion rule
Automatic WordPress-success distribution may be enabled only after an approval-gated live test returns verifiable publication receipts for each enabled destination.
