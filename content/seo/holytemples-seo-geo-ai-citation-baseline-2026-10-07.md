# HolyTemples.org SEO, GEO & AI-Citation Baseline

Baseline date: 2026-10-07  
Scope: Public, non-mutating checks only.  
Status: Baseline established; no live-site change performed.

## Public site checks

| Check | Observed state | Interpretation |
|---|---|---|
| Homepage | HTTP 200 over HTTPS | Public site is reachable. |
| TLS | HSTS present | Secure transport is enforced. |
| `robots.txt` | `User-agent: *`; `/wp-admin/` disallowed; `/wp-admin/admin-ajax.php` allowed | Public content is not globally disallowed. |
| Sitemaps | `https://holytemples.org/sitemap.xml` and `https://holytemples.org/sitemap.rss` declared | Discovery paths exist. |
| Homepage structured data | JSON-LD with `Organization` and `WebSite` detected | Entity/site schema exists; exact completeness and identity consistency still require schema validation. |
| Public rendering | Home page returned HTML content and author references | Text is available in the DOM rather than being entirely dependent on client-side rendering. |

## Crawler-access qualification

A generic browser fetch succeeded. Requests from the present test environment using crawler user-agent strings for OAI-SearchBot and Googlebot received a WordPress.com “Checking search engine crawler” challenge, while an OAI-AdsBot user-agent request returned 200.

This is **not sufficient evidence that genuine verified crawlers are blocked**: WordPress.com may validate source IPs, and the test environment does not originate from the providers' published crawler ranges. Treat this result as a log-validation item, not as a verified defect. Validate through Search Console URL inspection/crawl data and hosting logs filtered to the providers' published IP ranges before changing firewall or bot rules.

## Current official-provider checklist

1. Keep OAI-SearchBot allowed if inclusion in ChatGPT Search is desired; GPTBot training access is a separate choice.
2. Keep Googlebot access and public text rendering intact.
3. Preserve `Organization`, `WebSite`, `Person`/author, `Article`, and breadcrumb entity relationships where eligible, using consistent names and canonical URLs.
4. Maintain answer-first summaries, visible authorship, dates, source provenance, and explicit labels separating doctrine, historical interpretation, and verified claims.
5. Validate schema with Google's Rich Results Test and Schema.org validator; schema eligibility does not guarantee a rich result or AI citation.
6. Review Search Console's new multimodal-search reporting when available. Record a baseline before changing image strategy; optimize only where actual visual-search impressions exist.
7. Do not adopt unverified “GEO hacks.” Prefer crawlability, entity consistency, useful original content, primary sourcing, and third-party corroboration.

## Provider developments included in this baseline

- Google announced global rollout of a Search Console multimodal search-type filter on 2026-09-24. This is a measurement capability, not a new ranking requirement.
- OpenAI's crawler documentation distinguishes OAI-SearchBot (search visibility), GPTBot (training), ChatGPT-User (user-triggered retrieval), and OAI-AdsBot (ad landing-page validation). These controls should not be conflated.

## Next validation checks

- Inspect Search Console URL Inspection and crawl statistics for the home page, representative articles, author pages, and video companion pages.
- Validate the homepage and one recent article's JSON-LD for entity IDs, author identity, canonical URL, dates, and image objects.
- Check hosting/CDN logs for verified OAI-SearchBot and Googlebot source ranges before diagnosing the user-agent challenge as a crawler-access failure.
- Record multimodal-search impressions/clicks if the new filter is populated.

## Sources

- Google Search Central, “Announcing web multimodal Search performance reporting in Search Console,” 2026-09-24: https://developers.google.com/search/blog/2026/09/web-multimodal-in-sc
- OpenAI, “Overview of OpenAI Crawlers”: https://developers.openai.com/api/docs/bots
- OpenAI Help Center, “Advertiser Guidance for Allowing OpenAI Web Crawlers”: https://help.openai.com/en/articles/20001243-advertiser-guidance-for-allowing-openai-web-crawlers

