# NEO agent and worker wallets — Gate 1

Date: November 8, 2026 (America/Chicago). Owner: NEOsync. Workstream: Project 144 shared agent foundations.

Agents and workers may have distinct operator-controlled public address references for ecosystem participation. Gate 1 implements an offline proposal register alongside the existing Router worker fleet. It does not create wallets or change worker execution permissions.

## Verified foundations

- `server/neo-router/worker-fleet.mjs`: named workers, role and capability routing.
- `server/neo-router/worker-runtime.mjs`: leases, approvals and completion events.
- `services/neo-discord/core/treasury.js`: existing public-address balance reader.
- No live agent wallet ownership, Counterpay connection, balance or signing authority was verified during this gate.

## Delivered interface

`createAgentWalletRegister({ principals, engine })` defaults to existing fleet IDs. A trusted caller may supply existing agent IDs instead. `propose({ principalId, ownerId, address, protocol })` records one public address per principal and rejects duplicate addresses, unknown principals and additional fields. Owner IDs are operator references, not authentication evidence. Keep actual mappings in private runtime storage; this repository is public.

Gate 1 accepts checksum-valid legacy mainnet P2PKH addresses only. `protocol` is `bitcoin` or `counterparty`; both use the `bitcoin-mainnet` network label. Counterpay is the intended service integration, not an additional chain enum. Other address formats are explicitly deferred pending existing wallet/provider compatibility checks. Checksum validity proves neither ownership nor Counterparty eligibility or available funds.

Every proposal stays `pending-control-verification`, with signing disabled. There is deliberately no activation method. No wallet keys, seed phrases or wallet generation are involved.

`recordWork({ principalId, missionId })` references a completed Router mission only when its completion event names the same worker. It is idempotent per mission and returns a detached record with a SHA-256 digest. It copies no task objectives, action arguments or adapter results. A receipt is local attribution, not a signature, invoice, debt, reward entitlement, payment or Bitcoin inclusion proof. Existing trusted worker execution remains responsible for authorization and real work.

The module has no public endpoint, persistence, network calls, signer or transaction adapter. Call it only from trusted server code with a trusted engine. Caller identity cannot be established from arbitrary input. The engine's bounded event history can prevent receipt creation for old missions; create references promptly. Restart loses this in-memory register. It is not ready to accept deposits.

## Gate register

| Phase | Evidence / acceptance |
| --- | --- |
| VERIFY | Existing fleet, mission engine and treasury source inspected. |
| CONNECT | Local tests exercise the actual mission engine and fleet with a synthetic adapter. Live Counterpay connection remains unknown. |
| BUILD | Public address proposals and internal work references implemented. |
| TEST | Run `node --test server/neo-router/agent-wallet-register.test.mjs server/neo-router/worker-fleet.test.mjs server/neo-router/worker-runtime.test.mjs`. |
| DEPLOY | Feature branch and PR only; production activation deferred. |
| DOCUMENT | This record captures scope, decisions, dependencies and limitations. |
| NEXT GATE | Verify operator wallet control and provider compatibility; add private durable enrollment and recovery before live use. |

## Prioritized next work

1. Verify the actual Counterpay deployment and supported Bitcoin/Counterparty address formats; identify an operator-approved wallet custody and recovery workflow.
2. Implement reviewed control-proof verification, authenticated enrollment, revocation and rotation with private durable storage. Never put public address ownership mappings or private credentials in prompts or source control without specific disclosure authorization.
3. Connect completion references to the trusted server runtime with durable audit retention. Test restart, duplicate delivery and worker impersonation failures.
4. Any later spending adapter needs separately specified budgets, permitted assets/destinations, fee limits, approval requirements, replay protection and transaction reconciliation before funding or signing is enabled.

Decision: wallet association supplements existing agent identity and task permissions; it does not grant authority. Operator-controlled addresses can support the user's intended agent economy after enrollment and transaction gates pass. No live addresses have been assigned by this gate. Test fixtures are public historical addresses and must never be used as NEO deposit destinations.
