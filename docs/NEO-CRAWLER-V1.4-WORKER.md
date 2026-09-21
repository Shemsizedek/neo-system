# NEO Crawler v1.4 — Governed Worker

The worker closes the operating loop:

durable queue -> public/authorized crawl -> Evidence Vault -> governed neo.crawler.ingested event -> NEO Router mission -> queue completion.

Failures use the v1.3 retry/dead-letter contract. Evidence remains research input and downstream review boundaries remain intact.

Run one queued job with `node scripts/neo-crawler-worker.mjs --once`. Production scheduling/process supervision is a deployment concern and requires configured Redis/Upstash plus a writable persistent Evidence Vault path.
