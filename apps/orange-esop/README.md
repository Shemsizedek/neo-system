# Orange ESOP Application Layer v0.1

Additive Chaplaincy stewardship + employee-ownership application for the NEO System.

## Runtime
- Role-gated HTTP API
- Responsive Chaplaincy dashboard
- JSON development store
- Firestore production adapter
- NEOTRUST reconciliation controls
- RCF-013 certificate metadata endpoint
- RCF-015 annual statement metadata endpoint

## Run
```bash
npm run orange-esop:test
npm run orange-esop:server
```

## Production mode
Set `ORANGE_ESOP_STORE=firestore` and provide a Firestore-compatible database through the deployment runtime adapter. No credentials belong in source control.

## Control boundary
This app does not itself create a legal ESOP, appoint a fiduciary, issue employer stock, or move NEOTRUST. It operationalizes the approved administrative and reconciliation controls around those records.
