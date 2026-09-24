# NEO Social Common Campaign Pipeline v0.1

This gate connects the provider-aware dispatcher to a campaign-independent social distribution contract.

## Supported content lanes
- Noocracy Papers
- Daily Noocracy Report
- NOMNI / Ausarian Economics
- Omnitrix Chronicles

The lanes remain distinct. The common pipeline standardizes execution only; it does not merge editorial identity, publication policy, source provenance, or World Bulletin rules.

## World Bulletin policy
- Noocracy Papers: enabled as a separate canonical publication route.
- Daily Noocracy Report: locked.
- NOMNI / Ausarian Economics: disabled by default.
- Omnitrix Chronicles: disabled by default.

The social dispatcher does not publish to World Bulletin.

## Provider order
- Facebook: Windsor organic → direct platform API.
- LinkedIn: Windsor organic → direct platform API.
- X: Windsor organic.
- TikTok: direct platform API runtime.
- Instagram: Windsor organic.
- YouTube Community: browser/UI handoff.

Provider availability is resolved at runtime. The dispatcher remains fail closed and preserves its attempt ledger.

## Approval control
Campaigns whose payload declares approval required cannot dispatch unless the caller supplies `approvalGranted: true`.

## Omnitrix safety controls
The common pipeline preserves the `NEO_SOCIAL_OMNITRIX_ENABLED` kill switch.

## Receipt discipline
- platform identifier returned → `published`;
- provider accepted but returned no identifier → `submitted`, pending readback;
- provider error → failover to the next configured provider;
- all providers fail → fail closed.
