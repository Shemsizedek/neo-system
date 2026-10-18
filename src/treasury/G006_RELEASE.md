# NEO-TMS-G006 release checkpoint

## Committed
- TreasuryWindow is imported and mounted in the existing App Treasury view.
- UI remains explicit DEMO / NO LIVE ASSETS, with no backend calls.

## Release blockers
- Run npm install and project build and tests in CI; confirm Vitest dependency is present.
- Complete server-side authentication and temple-scoped access controls.
- Replace G004 fail-closed SQL posting stub only after independent approval verification, available-funds checks, append-only audit and concurrency tests.
- Implement and test PostgreSQL migration on staging, with rollback and restore drills.
- Connect the Treasury Window to authenticated read-only API before any write or settlement actions.
- Confirm trust instruments and assessment terms before issuing financial obligations.

No production deployment, successful test execution or live transaction is claimed.
