# NEO Crawler v1.3 — Operations

This gate binds the crawler queue contract to the Redis/Upstash infrastructure already used by NEO Router.

## Runtime
- durable Redis queue records
- QUEUED -> RUNNING -> COMPLETED lifecycle
- bounded retries
- DEAD_LETTER terminal state
- explicit operator requeue
- queue/dead-letter telemetry and health

The implementation uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. It does not place secrets in source control.

## Governance
Recovery is an explicit operator action. A recovered crawl remains research input and retains the downstream provenance/review boundaries established in v1.1 and v1.2.
