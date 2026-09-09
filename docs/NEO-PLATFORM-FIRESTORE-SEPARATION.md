# NEO Platform Firestore Separation v1.0

## Decision

NEO SYSTEMS and NEO services must not depend on Vercel for core runtime, service hosting, data persistence, routing, or business logic.

The canonical platform split is:

- GitHub: source control, review history, contracts, release governance, CI/CD.
- GitHub Pages: static/public frontend only.
- Firestore: primary managed persistence for authoritative application and service state.
- Provider-independent service runtime: APIs, workers, agents, protected business logic, and Firestore access.
- Discord and other channels: transport/control-plane adapters only.

## Firestore boundary

Production services must receive a Firestore-compatible client from the runtime environment. Credentials belong in runtime identity/IAM and must not be committed to source control or exposed to browser clients.

Authoritative state must not silently fall back to process memory. Services that require transactional or strongly coordinated writes must use Firestore transactions or a documented specialized persistence exception.

## Vercel removal

Vercel is not a core dependency and must not own NEO business logic or persistent state. Legacy Vercel deployment files are removed from the canonical repository architecture. Historical documentation may mention Vercel only when describing retired or comparative infrastructure.

## Migration exceptions

A service can temporarily retain a specialized store only when the current implementation genuinely depends on it and an architecture record marks the exception. NEO Counter currently uses an Upstash Redis hosted adapter; that implementation remains an explicit migration exception until replaced with a tested Firestore adapter. It must not be represented as Firestore-backed before that migration is complete.

## Runtime contract

Every NEO service runtime should follow this boundary:

```text
client/static UI
    -> authenticated service API
        -> business/service layer
            -> Firestore adapter
                -> Firestore
```

Transport adapters must not bypass the service layer to mutate Firestore directly.

## Security rules

1. Default deny for privileged operations.
2. Runtime identity/IAM instead of embedded service-account secrets.
3. No Firestore admin credentials in GitHub Pages or browser bundles.
4. No private keys, seed phrases, staff secrets, payment credentials, or signing material in Firestore unless a separately approved secrets/custody design explicitly requires it.
5. Sensitive writes remain approval-gated where the service contract requires human authorization.

## Acceptance criteria

- `architecture/neo-services-platform.json` declares Firestore as primary persistence.
- `architecture/neo-services-normalization.json` prohibits Vercel as a core/runtime dependency.
- Shared Firestore adapter boundary exists under `server/neo-platform-api`.
- Legacy root Vercel deployment configs are removed.
- Existing non-Firestore service stores are identified as migration exceptions rather than silently relabeled.
