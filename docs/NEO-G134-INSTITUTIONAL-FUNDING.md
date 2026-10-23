# Gate 134 — NEO Institutional Funding & Credit Execution Fabric

Gate 134 manages the lifecycle after Gate 133 has authorized credit capacity.

Approved credit -> draw request -> reservation -> funding authorization -> external/multisignature signature -> Gate 122 settlement -> advance ledger -> accrual / repayment -> collateral-release review.

Funding is never considered complete merely because a draw was approved or signed. Verified settlement evidence is required before an outstanding advance is created.

The service stores signer references and policies only; private keys remain external. Automatic disbursement and automatic collateral release are disabled.

Interest accrual and repayment schedules are accounting records. External lending, banking, securities-financing, tax, or jurisdictional requirements apply at the relevant interface.
