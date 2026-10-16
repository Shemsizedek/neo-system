# NeoTele — Gate 001: Chaplaincy eSIM Pilot

**Brand:** NeoTele. **Communications network:** NEO Wire. **Background provider fabric:** Noogle Fi.

## Objective
Establish the first NEO-branded mobile-service enrollment pilot for authenticated Chaplaincy members. Reuse NEOpass, Chaplaincy CRM, NEO Guardian, NEO Wire, and NEO Telegram. This gate is a service model and testing foundation; it is **not** an active SIM or carrier contract.

## Architecture
NEOpass member session → Chaplaincy membership authorization → NEO Guardian device eligibility → NeoTele service request → Noogle Fi carrier/MVNO provisioning adapter → provider SM-DP+ activation → carrier-confirmed service status.

NEO Wire handles service identity, communications UI and supported payment workflows. Payments do not themselves activate the cellular subscription.

## Roles
- Chaplaincy administrator: approves pilot membership and eligible service requests.
- Member: sees own device and plan eligibility, with no access to other members' subscription data.
- Carrier provisioning adapter: obtains real profile and activation status from contracted operator, never fabricated locally.
- NEO Guardian: verifies device binding and approvals; no raw fingerprint collection.

## Minimum member journey
1. Sign in using NEOpass and verify Chaplaincy pilot membership server-side.
2. Register an eSIM-capable, unlocked device; validate carrier compatibility.
3. Choose an approved plan and funding method.
4. Review terms, consent and subscription fees.
5. Request service; backend records REQUESTED and progresses through the defined workflow.
6. Provision only through an authorized carrier/MVNO integration with compliant SM-DP+; handle activation data as sensitive.
7. Mark ACTIVE only after authentic provider evidence confirms activation; never treat a QR mockup as an actual eSIM.

## Service integration contracts
- Identity: existing NEOpass authentication and CRM roles.
- Device: NEO Guardian and passkeys where certified.
- Connectivity: Noogle Fi priority/failover routing among **contracted** providers.
- Calls, SMS, IVR and VoIP: NEO Wire service APIs and external telecom partners.
- Messaging: NEO Telegram, with off-chain encrypted payloads.
- Billing: NEO Wire currency quotations and permitted settlement rails (no custody/signing enabled by Gate 001).
- Emergency service, E911 location, number portability, lawful intercept and consumer disclosures must be addressed with qualified carrier/legal partners before public launch.

## Gate 001 acceptance
- Separate feature branch created from main.
- Chaplaincy-only pilot enrollment model with explicit device checks.
- Provider-gated lifecycle preventing simulated activation.
- Unit tests for admission and activation controls.
- No secrets, production provisioning, assigned real telephone numbers or live billing.
- Review integration and security requirements before merge.

## Next gate
NTEL-002: authenticated Chaplaincy CRM + NEO Guardian device registry bindings, eSIM compatibility matrix, provider selection API, persistence and audit; remain sandboxed pending MVNO contract and GSMA-compliant profile provider.
