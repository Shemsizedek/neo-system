# Gate 132 — NEO Prime Brokerage & Institutional Account Fabric

Gate 132 supplies the institutional account hierarchy beneath Gate 131 risk.

Institution -> Master Account -> Subaccounts / Portfolios -> Positions / Collateral -> Risk.

Custody modes are explicit: self custody, community custody, or external custodian. The fabric stores references and records, never seed phrases or private keys.

Cross-margin is a consolidated risk view only. Financing and borrow/lend inventory are recorded but not executed by Gate 132. Any actual lending, borrowing, financing, or custodial execution requires a separate authorized adapter and evidence path.

Institutional statements are digest-stamped for integrity and can later be anchored into Crown evidence.

This is an internal institutional account/coordination fabric, not a claim of external prime-broker, broker-dealer, bank-custody, or securities-lending status.
