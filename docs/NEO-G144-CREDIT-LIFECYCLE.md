# Gate 144 — NEO Credit Lifecycle Orchestrator

Gate 144 coordinates the full NEO credit lifecycle without replacing the authority of the underlying services.

Application -> underwriting -> pricing -> origination -> credit reservation -> funding authorization -> settlement -> servicing -> tradeline/credit passport -> reporting QA -> reporting/compliance -> closure.

Every transition requires an event ID, service reference and evidence reference. Idempotency keys prevent duplicate event processing.

Cross-service work is tracked as a saga. Failed steps enter NEEDS_RECOVERY. Automatic compensation is disabled by default because financial and legal state transitions may not be safely reversible.

Material exceptions route to Gate 139 compliance case management. The orchestrator maintains a digest-stamped unified lifecycle timeline suitable for later Crown anchoring.
