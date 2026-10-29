# XChain integration

NEO Explorer renders a dedicated XChain testnet panel with network status and token lookup for Bitcoin testnet (TBTC) only. The client uses the public documented explorer REST API with GET only, no credentials, a ten-second timeout, cancellation and freshness reporting. The adapter rejects all other networks before transport, and status output is projected onto Bitcoin alone. Unknown freshness remains unknown; stale or halted data is not presented as current.

XChain Platform currently advertises testnet only. It is distinct from the former Counterparty explorer at xchain.io. Historical NOMNI archive targets remain historical records. XChain results never enter Counterparty treasury registries, production market quotes, or Crown Chain ownership/valuation evidence.

No SDK package is installed: upstream says it is not published on npm. This integration uses documented HTTP endpoints without copying upstream code. No keys, signing, issuance, bridges or transaction broadcast are enabled.

References checked 2026-10-29:
- https://xchain.io/developers/sdk
- https://docs.xchain.io/components/explorer/api
- https://xchain.io/

Validation: node --test tests/xchainAdapter.test.mjs
Live upstream connectivity and deployed-browser acceptance must be checked separately; unit fixtures are not live-data evidence.
