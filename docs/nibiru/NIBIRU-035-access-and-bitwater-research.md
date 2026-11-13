# NIBIRU-035 — Deal Desk access acceptance and NEO Energy research boundary

Status: **DRAFT / NO PRODUCTION ACTIVATION**  
Scope: existing NIA-013 Deal Desk and NEO Energy research. This note contains no private property, personal, or offering data.

## Deal Desk release acceptance
1. Inspect `desk.holytemples.org` DNS records and confirm the hostname is attached to the correct Render service with issued TLS certificate. A live Render deployment alone is not proof of domain health.
2. Test HTTPS GET `/healthz` using the custom hostname; verify certificate subject/chain, HTTP status, and that the health endpoint does not leak secrets.
3. Confirm the `/` → `/portal/deal-desk` routing fix in draft PR #1222 passes tests before merging.
4. Attach the NIBIRU-025–034 service **only** after server-side NEOpass token verification and an independent, server-controlled Deal Desk role lookup. Never authorize from client-supplied roles.
5. Use an application login with only the permitted `neo_deal_desk_limited` role. It must not inherit database ownership, `neon_superuser`, `CREATEROLE`, or BYPASSRLS.
6. Verify connection identity with `current_user` and membership from a secured staging connection. Assert denial of audit UPDATE/DELETE, opportunity DELETE, offering_status UPDATE, unauthorized SELECT and unverified reviewer actions.
7. Run the transactional writer rollback tests and a real isolated-staging transaction that intentionally fails audit insert; verify opportunity insertion is rolled back and no partial records remain.
8. Require durable audit record, reviewer identity, authorization decision, and documented legal review before any investor-solicitation state transitions.
9. Do not insert any private investment documents or Nibiru property data until these checks pass.

## NEO Energy / Heatbit Bitwater research (not an investment recommendation)
- Manufacturer claims: 20 BM1370 ASIC chips, up to 34 TH/s, up to 600 W, `$899` Genesis preorder with Q1 2027 estimated shipping (checked 2026-10-25).
- Source: https://heatbit.com/ ; specs and availability remain manufacturer-provided and not independently laboratory-certified here.
- Compare baseline electric resistance tank heating versus actual measured combined mining + water heat consumption; account for standby loss, seasonal demand, heat-pump water heater opportunity cost, networking downtime, capital expense, warranty, installation safety, and local appliance certification.
- The principal economic question is whether the device runs when the hot water is required and substitutes heating electricity, rather than dumping unwanted heat or increasing electric demand. Mining revenue estimates are variable and not assured.
- Intake classification: `NEO Energy / technical research`; **do not create a private investor opportunity, purchase order, or public return claim** without separate approval.

## Hold
No deploy, production change, confidential intake, mining purchase, investment marketing or securities issuance authorized by this document.
