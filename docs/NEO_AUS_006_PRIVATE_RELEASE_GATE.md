# NEO-AUS-006 — Private release security gate

Status: **NOT RELEASED**. This document is a release checklist, not a deployment record.

## Required verification
1. GitHub Actions Node 24 build must pass; execute the economic assertion function in a suitable harness.
2. Browser tests must render both routes and verify numeric inputs, labels, classification selector and review flags.
3. Confirm React Router's route handling in the actual configured Vite base path.
4. Require authenticated identity at the hosting edge before serving the SPA; client-side navigation is not access control.
5. Restrict preview to approved NEO operators; enforce HTTPS, no public indexing, no embedded API secrets.
6. Use an existing GCP Cloud Run or approved private NEO host, not Vercel. Check IAM and ingress configuration and test an unauthenticated request returns 401/403 or redirects to approved sign-in.
7. Verify signed-in mobile access and log out behavior.
8. Do not connect wallets, live price claims, issuance, lending, custody or settlement.

## Integration status
- NEOsync doctrine: canonical object indexed on main.
- React dashboard routes: committed in PR #1025, build not yet verified.
- Native GISS enrollment, gradebook and Oracle endpoint: pending.
- Private URL: not available until authenticated acceptance succeeds.
