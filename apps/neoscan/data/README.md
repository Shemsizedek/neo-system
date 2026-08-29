# NEOscan public statement accounts

`public-statement-accounts.json` is the public registry used by GitHub Actions to decide which blockchain addresses receive prebuilt NEO Statement snapshots on GitHub Pages.

Only public addresses and display labels belong here. Never place private keys, seed phrases, CES tokens, service credentials, or other secrets in this directory.

`NEOSCAN_STATEMENT_ACCOUNTS` remains an optional GitHub Actions override. When it is empty, the snapshot builder reads the tracked registry. This keeps the default production publication path reproducible from the repository while allowing an environment-specific override when needed.
