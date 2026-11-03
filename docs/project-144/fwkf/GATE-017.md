# Project 144 — Gate 017: Restore Foundation, integrate modern World Café, SEO and City marketing

**Date:** November 1, 2026
**Status:** Deployed, primary HTTPS pages verified. Forum posting and physical café openings are separate future deliveries.

## Website structure and content preservation

- **Foundation home** remains `https://worldcafe.holytemples.org/`. Restored the prior long-form Foundation presentation from its verified GitHub blob `1315277fb2f2b121909d924f2aeb0d659800d7e7`. It preserves the original-style navigation and **17 anchor-linked content sections**, with selected misleading technical/financial project copy replaced by plain public information.
- The new minimalist World Café experience remains separately available at `https://worldcafe.holytemples.org/world-cafe.html`. It retains the earlier newer design, with useful buttons for World Café Events, Conversations, Knowledge Cafés, Forum and World Library.
- The original navigation was extended (not replaced) with World Café and Investor Relations links. Added accessible mobile menu because the existing layout hides desktop navigation at narrow widths.
- Preserved public supporting routes: `events.html`, `conversations.html`, `cafes.html`, `forum.html`, `knowledge.html`, `investor-relations.html`.
- The restored page is the **previous full Foundation web edition**, not a byte-identical deployment of the older 34-file archived React build. That archival source remains separate.

## Public copy and Word Temple City

- Published page `https://holytemples.org/world-temple-city/`, WordPress ID 3040, was updated using Gutenberg optimistic-locking. World Café paragraph now reads as a welcoming, marketable exploration of books, learning, gatherings and connection — no internal project chatter.
- Added actual WordPress `core/buttons` / `core/button` components to the Café card, matching existing outline buttons: **Explore World Café** → `https://worldcafe.holytemples.org/`.
- Fixed previously malformed `</p></p>` markup in that card. The resulting published page has no block content warnings; readback confirms one new button.
- World Temple City introduction refers to **the Smart City of Peace** and the wider **Smart Cities of Peace** vision.
- Updated only the page excerpt to a marketable Smart City description. Existing WordPress page title, permalink, other city component blocks and unrelated navigation were preserved.

## SEO

- Restored indexability for the original Foundation homepage and **six public World Café / learning pages**: `index,follow,max-image-preview:large` in HTML.
- **Investor Relations remains `noindex,follow`**, and is intentionally excluded from sitemap pending disclosures/registration review; its information remains accessible by direct link.
- Added per-page title, unique meta description, self-canonical HTTPS `rel=canonical`, Open Graph title / description / URL, Twitter summary card, and WebSite JSON-LD on the Foundation root. No fabricated dates, addresses, reviews, opening hours or local-business structured data.
- Corrected `robots.txt` from blanket `Disallow: /` to `Allow: /`, with sitemap link.
- Added `sitemap.xml` with **seven canonical, public marketing URLs** (and no Investor Relations entry). The canonical host is `https://worldcafe.holytemples.org`; this also helps identify the preferred URL over the direct Render preview domain.
- Note: Search appearance is not guaranteed, and a Search Console property/crawl submission was not confirmed in this gate.

## Verification

- Source regression test `scripts/verify-worldcafe-public-site.mjs`: **PASS** (original anchor/navigation preserved, eight pages including Investor Relations, correct link targets, canonical tags, sitemap/robots, no private project copy, token-only IR, null-only public index).
- Render manual deployment `dep-dbjq3q8ae00c73evqtqg` reported **live**, commit `0fdfe73b76aa405ef656d17cbac234daa90fdbd9`.
- Independent HTTPS fetches: Foundation homepage, new World Café experience, World Temple City page, `robots.txt`, and `sitemap.xml` all **HTTP 200**; Foundation homepage has prior full design and cross-link, and new café experience retains new design.
- WordPress readback verified published city page, exactly one Café button, Smart City language, and corrected block markup. The excerpt-only update returned the intended wording.
- An auxiliary device smoke command timed out. The site does **not** depend on the device for hosting. Independent HTTPS checks and Render reported deployment status are the authoritative live evidence.

## Privacy and product status

- No user/private conversations or internal NEO operational notes exposed on public marketing pages.
- Asset sale / Bitcoin token details remain only in Investor Relations; no on-chain issuance or new token broadcasts.
- The public Knowledge Index definitions contain no measurement observations or investor data.
- Free World Knowledge Forum is still a product introduction page; actual moderated posting needs identity, privacy and security acceptance.
- Local physical Knowledge Cafés remain a proposed business network; no location, opening, regulatory approval, lease or operational service is claimed.

## Next priorities

1. Improve SEO with first-party search-console verification, sitemap submission and real-index coverage monitoring (optional Search Console connector; needs authorized property access).
2. Build the real moderated Knowledge Forum, tracked in issue #1298.
3. Establish first World Library flagship Knowledge Café operating readiness, then city rollout, issue #1299.
4. Finish human legal/compliance copy review before making Investor Relations indexable.
