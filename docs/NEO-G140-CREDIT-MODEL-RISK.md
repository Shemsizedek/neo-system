# Gate 140 — NEO Credit Governance & Model Risk Control

Gate 140 governs the models that produce NEO credit ratings and related reason codes.

Model definition -> version -> validation -> backtest -> approval -> activation -> monitoring -> retirement.

Unversioned, unvalidated, unapproved, or retired model versions must not be used for production credit decisions.

Adverse-action reason codes must be registered with the model version. Model inference alone is not sufficient; downstream Gate 139 case/notice workflows still require source-backed reasons.

Overrides require an identified actor, explicit reason, before/after value, and evidence references. Overrides are never silent.

Drift monitoring records changes in model-input/output distributions and raises a drift flag when the configured threshold is exceeded. A drift alert is a monitoring indicator, not proof that the model is discriminatory or legally noncompliant.

This is an internal model-governance system and does not by itself establish external fair-lending, model-risk, consumer-credit, or regulatory compliance.
