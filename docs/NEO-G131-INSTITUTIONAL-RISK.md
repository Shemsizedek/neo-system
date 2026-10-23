# Gate 131 — NEO Institutional Risk, Margin & Portfolio Control

Gate 131 is the cross-system risk layer for Gate 122 clearing, Gate 127 treasury, Gate 129 routing and Gate 130 OMS/EMS.

It tracks marked positions, gross/net exposure, concentration, realized/unrealized P&L context, parametric VaR, stress scenarios, margin utilization and risk-limit breaches.

Missing prices or volatility are not silently estimated. Risk becomes unavailable or blocks new risk where policy requires.

The kill switch blocks new risk-taking before any liquidation logic is considered.

Liquidation remains a recommendation and authorization workflow. Automatic liquidation is disabled unless a future gate adds an explicitly authorized execution policy and verified routing/settlement path.
