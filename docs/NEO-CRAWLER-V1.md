# NEO Crawler v1 — Unified Intelligence Ingestion Layer

## Purpose

NEO Crawler is the NEO System's shared ingestion boundary for authorized/public-source discovery, retrieval, provenance capture, normalization and downstream routing.

It is deliberately separate from NEO Algo. The crawler acquires and packages evidence; NEO Algo reasons over approved inputs. NEO Oracle, NEOsync, NEO Router, Noogle/Neopedia, GISS NEO LMS and NEO Law may consume crawler envelopes according to their own policy gates.

## Runtime interface

`server/neo-crawler/index.mjs` exports:

- `createNeoCrawler()` — creates a crawler service with optional adapters.
- `neoCrawler` — default singleton.
- `crawl(url | descriptor)` — invokes a built-in public-source/domain crawl or a registered adapter.
- `register(name, handler)` — attaches an authorized adapter without changing the core crawler.
- `capabilities()` — exposes service version, supported adapters, security boundaries and downstream systems.

Built-in crawling reuses the existing Noogle crawler implementation rather than duplicating it:

- `apps/noogle/index/crawler.mjs`
- `apps/noogle/index/domain-crawler.mjs`

## Governance envelope

Every unified crawler response identifies the service, version, adapter and generation time and asserts these controls:

1. provenance is required;
2. source identity must remain attributable;
3. facts, inferences and claims must remain distinguishable downstream;
4. crawler output does not automatically become legal authority;
5. crawler output does not automatically become NEO doctrine or an Internal NEO Society norm;
6. crawler output does not automatically become GISS/NEO LMS published curriculum.

## Security boundary

NEO Crawler is limited to authorized/public acquisition paths. The built-in public web crawler does not bypass authentication, robots/access controls, CAPTCHAs, paywalls, private networks or restricted services.

## Integration map

```text
public / authorized sources
          |
          v
     NEO Crawler
          |
          v
      NEO Router
       /   |   \
      v    v    v
NEO Algo  Oracle  NEOsync
   |        |       |
   +--------+-------+
            |
     governed outputs
       /      |      \
Noogle     GISS LMS   NEO Law
Neopedia              Evidence/Research
```

## Next maturity gate

Add durable crawl queues, source/robots policy registry, deduplication, content chunking, persistent provenance/evidence storage, adapter-specific rate limits, and explicit routing contracts for NEO Router and NEO Evidence Vault.
