# MERCHANT-021 — Source-of-truth and checkout compliance gate
Updated: 2026-10-20
Merchant account: 5429352076 — display name "The House"
Account organization (user-confirmed): World Temple
Public storefront: https://shop.holytemples.org/
Presentation: NEO Shop; House of Negus merchandise collection
Embedded provider: Shop ID 1590954; technical integration only
## Rules
- Preserve The House as the Merchant Center store name unless Google explicitly rejects it; account legal operator is a distinct field.
- Do not represent World Temple as the merchant of record, payment processor, shipper, or legal seller unless supported by checkout documents.
- Keep product URLs distinct and item-specific; do not replace them en masse with homepage URLs.
- Do not invent product price, availability, shipping speeds/costs, returns/refunds, physical addresses, phone numbers, or seller legal identities.
- Do not submit account review until the following audit is complete.
## Required acceptance evidence
1. Public GET/HEAD HTTPS 200 on https://shop.holytemples.org/ from an independent crawler; canonical HTML and JS rendering verified.
2. Inspect order confirmation and a test checkout up to the payment step without charging: identify actual seller and fulfillment operator, and capture links to real shipping, refund and privacy policies.
3. Verify contact page status and visible contact method, matched to Merchant Center business information and payment profile.
4. Verify source product feed ownership, product id, title, price, availability, image, condition and landing URL. For at least three actual items, confirm mobile HTTPS landing, correct variant, price and availability matches and functioning cart.
5. Verify Merchant Center Diagnostics issue details, claimed/verified website, business legal name/address/phone and identity verification requirements using authorized direct Merchant interface.
6. Verify shipping and return rules in Google Merchant account match the actual policies shown to customers.
7. Record evidence and request re-review only when all issues are fixed. Re-check Google status after submission.
## Observed blockers
- Connected Windsor.ai Google Merchant data returns a Free plan limit message rather than authentic diagnostics; **zero counts returned are invalid**.
- External access to the production shop could not be independently verified using the available public fetch path; do not assert Googlebot crawl success.
- Checkout seller/return/privacy policies and item-level data unverified.
## Google references
- https://support.google.com/merchants/answer/6150127
- https://support.google.com/merchants/answer/13585221
- https://support.google.com/merchants/answer/12472091
