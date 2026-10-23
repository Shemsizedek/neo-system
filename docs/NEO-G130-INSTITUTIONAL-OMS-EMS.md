# Gate 130 — NEO Institutional OMS / EMS

Gate 130 manages legitimate institutional orders from creation through allocation.

Flow:

parent order -> pre-trade risk -> approval -> execution strategy -> child orders -> Gate 129 routing -> fills -> parent aggregation -> allocation -> Gate 122 settlement.

## Execution strategies

DIRECT sends the approved quantity as one child order.
TWAP divides the parent quantity across time slices.
VWAP distributes slices according to a supplied, sourced volume profile.
POV caps participation to a configured fraction of observed market volume.

Strategies optimize execution of an existing economic order. They must not create artificial volume, self-crossing, or wash trades.

## Risk

Pre-trade controls include order quantity/notional, price limits, position limits and maximum participation rate. Gate 129 remains responsible for venue eligibility and self-trade filtering.

## Audit

Each consequential OMS event is chained with a SHA-256 digest suitable for later Crown evidence anchoring. The digest proves record integrity within scope; it is not itself proof that the underlying trade occurred on an external venue.
