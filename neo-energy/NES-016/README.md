# NES-016 — NEO Utility browser demo and NEO Pass adapter

This gate delivers a **static, local simulation UI**, not a deployed web service.
- Open `dashboard.html` locally to inspect Customer, Operator and Engineer views.
- All displayed usage, capacity, balances and flags are synthetic examples.
- No customer data, production service, external HTTP calls or field controls are present.
- `neopass_adapter.py` deliberately rejects all credentials until a trusted token verifier is integrated, reviewed and tested.
- Requires identity provider discovery, issuer/audience verification, approved JWK signing keys, robust site grants and tenancy isolation, session security and audit logs before real customer usage.
- PostgreSQL migration from NES-015 is only a draft; no migration executed.
- Test: `python -m unittest discover -s neo-energy/NES-016 -p 'test_*.py' -v`.

## Acceptance before next stage
Automated CI green, interface accessibility review, real JWT provider specifications, server-side grants, API rate limiting, tenant isolation testing, approved privacy policy and database migration rehearsal.
