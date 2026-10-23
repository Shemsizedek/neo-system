# ADS-008 — AMP Auto Ads integration (staged)

Adds AMP-only AdSense component for holytemples.org (publisher ca-pub-7219200716649339).

## Safety boundaries
- This plugin is **not yet installed on production** merely because source is committed.
- On non-AMP responses, no HTML is injected.
- Requires official WordPress AMP plugin and a theme that calls `wp_body_open`.
- Before installing, confirm that AMP plugin / existing monetization integration does **not already emit** an `amp-auto-ads` custom-element script or body tag; duplicates are invalid.
- Standard pages should continue using Google Site Kit's normal AdSense implementation.
- Does not establish AdSense approval, ads.txt reachability, or live serving.

## Deployment/acceptance
1. Confirm AMP template mode and validate an actual post's AMP HTML.
2. Confirm AMP auto ads code is absent before enabling this plugin.
3. Install this directory as a WordPress plugin through approved deployment route and activate.
4. On a real AMP page, verify exactly one `<script async custom-element="amp-auto-ads" ...>` in head and one `<amp-auto-ads type="adsense" data-ad-client="ca-pub-7219200716649339">` directly within body.
5. On non-AMP homepage, verify neither AMP-specific snippet appears.
6. Validate via AMP validator, check `/ads.txt` and Google AdSense account approval and ad delivery separately.
7. Roll back by deactivating this standalone plugin.

## Current outcome
Source staged for review only. No production mutation or live acceptance tests performed.
