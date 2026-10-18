# CASHFLOW-003 — NEO Commercial Preview

A responsive, dependency-free commercial landing page prototype. Designed to become the frontend of the enterprise sales funnel.

## Confirmed implementation
- Three canonical premium business offerings with indicative asking prices.
- Form captures organization, email, offering, project scope, budget, schedule, and contact consent.
- Browser-native required-field and email validation.
- **Local-only form:** clicking preview does not send or persist customer data. No API endpoint or payment integration is present.
- Plain-language payment readiness section. Does not accept money.
- Mobile-friendly responsive cards and accessible labels/status.
- No index/no follow metadata; source may be public if repository is public, but no deployment was performed.

## Release blockers
1. Specify controlled HTTPS lead intake API; validate server-side and apply rate limits, spam controls, privacy policy and retention policy.
2. Integrate NEO Deal Desk lead registry and idempotency; verify authorization, auditable notifications, and CRM operations.
3. Confirm approved contact / legal terms / sales owner.
4. Use verified processor / reconciled settlement for actual checkout. No success-URL claims.
5. Validate on physical mobile devices and keyboard/screen-reader testing.
6. Approve publication only after acceptance evidence, then configure canonical domain and deploy.

## Manual checks
- Try submit empty form: blocked by browser validation.
- Invalid email: blocked.
- All fields valid and consent checked: displays local-only draft status, makes no network submission.
- Narrow viewport: offers stack; no horizontal overflow expected.
- No card number, wallet key or payment collection fields.

## Pricing source
`registry/neo-commercial-pricing.yaml` (status active-proposed). Scope and contract subject to approval.

## Deployment
Not deployed. Draft source PR only.
