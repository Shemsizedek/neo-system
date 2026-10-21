# MERCHANT-032 — Google review evidence and remediation

## Authoritative account correspondence
- Google Merchant Center account 5429352076, store display name The House.
- Google review-result email dated September 28, 2026, subject: "The House, your review request has been completed".
- Result: review completed; Misrepresentation remains; product listings and/or Shopping ads unavailable.
- Google states government-issued ID verification **may** be required; do not claim mandatory until account status shows that step.
- This email does not identify a name mismatch, domain, or individual product as the specific cause.

## Identity mapping to preserve
- World Temple: account organization (user confirmed); verify actual legal business / payments name against records.
- The House: Google Merchant store name and short name for The House of Negus.
- The House of Negus: full shop/collection name.
- NEO Shop: storefront operating at https://shop.holytemples.org/.
- The actual merchant of record, contact information, return obligations and shipment origin must match checkout and Merchant Center; not inferred merely from account ownership.

## Current deployment verification
- Render service srv-dbbvid5pkucs73d304cg deployment dep-dbc3t69srm7s739it1o0 confirmed live on Oct 21 2026 UTC.
- Public custom domain and Render origin were not independently accessible through the current external test environment. This does not prove Googlebot failure; browser and external crawler evidence needed.

## Remaining review gates
1. In Merchant Center 5429352076, open Account issues / Needs attention / Misrepresentation and capture all issue details, account verification requirements and review eligibility.
2. Verify account legal business name/address/contact and claimed website. The House is a trade/short name, not automatically the legal seller.
3. Verify checkout seller identity, shipping, returns and customer service against published policies.
4. Obtain original product feed and sample real SKUs. Reconcile per-item ID, URL, price, availability and image to purchasable pages. Do not replace item landing URLs with the homepage.
5. Confirm indexable HTTPS product destinations without error and valid checkout, including Googlebot visibility if possible.
6. If identity verification is explicitly requested by Google, complete in Google's secure authenticated portal; no identity documents in code, chat, or email.
7. Once checks pass, request review using the account's available review workflow; preserve original notice and updated evidence. Do not repeatedly request premature appeals.

## Google policy
https://support.google.com/merchants/answer/6150127
