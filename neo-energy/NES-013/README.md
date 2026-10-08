# NES-013 — NEO Energy Integration Validation

This integration scaffold connects NES-008 interval simulation, NES-009 statements, NES-010 nonredeemable energy credit proposals, and NES-011 site-scoped authorization.

It provides **no web server, no NEO Pass authentication verifier, no persistence, no money movement, and no physical dispatch**.

## Tests
From the repository root:
```sh
python -m unittest discover -s neo-energy/NES-008 -p 'test_*.py' -v
python -m unittest discover -s neo-energy/NES-009 -p 'test_*.py' -v
python -m unittest discover -s neo-energy/NES-010 -p 'test_*.py' -v
python -m unittest discover -s neo-energy/NES-011 -p 'test_*.py' -v
python -m unittest discover -s neo-energy/NES-013 -p 'test_*.py' -v
```

## Release criteria
- All existing and new tests pass on CI.
- Reject synthetic data in any billable or transferable ledger.
- Verify tenant isolation; do not mistake a boolean verified_identity supplied by a caller for actual NEO Pass verification.
- Provide a persistent append-only event store, identity-verification middleware, role grants and secure audit trail before a customer preview.
- Physically protected controllers remain isolated from this system.
