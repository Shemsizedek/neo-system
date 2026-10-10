# NES-020 — Identity middleware and PostgreSQL security test specification

Source files:
- `secure_context.py`: fail-closed identity context and tenant-scoped access requirement.
- `test_secure_context.py`: negative tests for cross-tenant, cross-site, expired, wrong audience, wrong purpose, untrusted objects and revoked grants.
- `postgres_security_plan.md`: staging database test and deployment requirements.

**Security warning:** `VerifiedSession` is a data contract, not cryptographic evidence. Callers can construct the dataclass; do not expose it to an untrusted request boundary. Only instantiate after actual NEO Pass cryptographic verification. No trusted verifier, real PostgreSQL RLS deployment or public customer portal is included.

NES Energy / NEO Utility control, settlement, billing and customer integrations remain disabled.
Run `python -m unittest discover -s neo-energy/NES-020 -p 'test_*.py' -v`.
