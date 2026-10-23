# Gate 141 — NEO Credit Decision Engine & Underwriting Policy Fabric

Gate 141 turns verified application data, credit policy, and an approved Gate 140 model into a controlled underwriting decision.

Application -> eligibility -> affordability/capacity -> approved model invocation -> credit policy -> approval or manual review -> decision record -> offer -> expiration.

Model output is advisory input and never the sole decision authority. The policy layer must make the actual decision, and manual review remains available for exceptions.

Capacity uses verified income and stated obligations. If required data are not verified, capacity is unavailable rather than estimated.

Decision records preserve eligibility, capacity, model version/output, policy reasons, and manual-review state. Offers require an approved decision and an explicit expiration date.

Automatic funding remains disabled; accepted offers must still flow through Gate 133/134 credit-control and funding controls.
