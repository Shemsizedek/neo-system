# NEO-CES Authenticated Coordinator Worker v2

Server-side extension for the NEO-CES Coordinator Agent Framework.

Adds:
- environment-backed secret references per exchange
- coordinator browser/session abstraction
- authenticated read worker
- normalized record sink
- scheduling primitives
- NOMNI market packet publication

Safety/authority boundary:
- read-only by default
- no credentials in source or payloads
- no transaction/member writes
- no browser scraping implementation is bundled until CES login/page behavior is verified and authorized
- raw CES observations remain separate from NOMNI-derived metrics
