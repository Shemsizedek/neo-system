# CES live ingestion gate

This gate defines the provider-neutral contract for bringing authorized CES data into NEO without requiring Cloudflare or assuming a CES public API.

## Supported inputs

- authorized coordinator/account exports
- an authenticated read-only connector added later
- a future CES API adapter when CES exposes and authorizes one

All transports normalize into `neo.ces.ingestion.v1` before downstream use.

## Safety boundary

The ingestion contract is read-only. It contains no login automation, password storage, transfer, trade, payment, signing, mutation, or coordinator administration methods. Imported records are marked `verificationStatus: imported` until a transport-specific verifier establishes stronger provenance.

## Downstream path

CES source -> CES ingestion contract -> NEOscan Statements / NEO Router -> Discord operations -> approved NEO consumers.

No unlike currency or asset units may be consolidated without an explicit valuation rate, timestamp, and valuation source.

## Next transport gate

Implement one authorized transport at a time. Prefer an official CES API when available. For the current account/session service, use only an explicitly authorized integration mechanism and keep credentials server-side; do not commit credentials or browser session material to the repository.
