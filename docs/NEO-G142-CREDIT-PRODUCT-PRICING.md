# Gate 142 — NEO Credit Product & Pricing Engine

Gate 142 controls the economic terms offered after Gate 141 underwriting.

Approved application -> product version -> pricing policy -> risk band -> rate / fees / term -> effective-cost calculation -> offer version.

Products and pricing policies are versioned. Risk bands add explicit spreads to configured base rates. Fees are itemized rather than embedded silently.

The built-in APR/effective-cost calculation is an internal pricing estimate only. Jurisdiction-specific APR, fee, usury and disclosure calculations require separately verified rules before they can be presented as legally compliant disclosures.

Pricing overrides require an identified actor, reason and evidence references.
