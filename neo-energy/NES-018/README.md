# NES-018 — NEO Energy Release Security and Tenant Isolation Gate

This is an offline evidence checklist evaluator, not an implementation of NEO Pass or field control.

**NES-017 status:** gateway read-only WSGI skeleton committed; actual NEO Pass session provider not connected. No live customer deployment.

## NES-018 acceptance areas
- Identity: trusted token verification, server-maintained site grants, adversarial tenant isolation tests.
- Data: PostgreSQL migrations, disaster recovery restoration rehearsal, audit logging.
- Security: TLS, request rate limiting, privacy/security assessment.
- Simulation: verified green test runs on integration/gateway/ledger modules.
- Separate field authorization: utility permission, engineer of record, protection study and commissioning signoffs, trained operators.

`release_guard.py` accepts explicit Boolean evidence values. It **does not verify** these claims independently and should not itself be used to approve deployment; accountable reviewers must authenticate and examine evidence artifacts.

Use `python -m unittest discover -s neo-energy/NES-018 -p 'test_*.py' -v`.

Next: verify real NEO Pass issuer metadata and exact authentication endpoints, build identity adapter using approved SDK, introduce PostgreSQL isolation fixtures and API threat tests. No production changes, commands or monetary operations allowed.
