# NOMNI-SOCIAL-008 — Live Publication Runner

This gate adds the executable publication runner for **NOMNI-TECH-001**.

Required GitHub environment: holytemples-production.

Variables:
- FACEBOOK_PAGE_ID
- LINKEDIN_OWNER_URN
- YOUTUBE_CHANNEL_URL

Secrets:
- FACEBOOK_PAGE_ACCESS_TOKEN
- LINKEDIN_ACCESS_TOKEN

Workflow input:
- image_url: canonical public HTTPS URL for the approved 16:9 campaign card.

Behavior:
- Facebook publishes through the existing Graph API image adapter.
- LinkedIn initializes media, uploads the image, then creates the image post.
- YouTube Community creates a browser/UI handoff only.
- World Bulletin remains disabled.
- A normalized publication receipt bundle is uploaded as a workflow artifact.

The workflow refuses to run if the image is not HTTPS, cannot be fetched, is empty, or required production credentials are missing.
