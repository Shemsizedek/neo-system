# Settlement Consumer Tests

NEO Exchange includes unit coverage asserting that an unconfirmed browser return cannot become fulfillment-eligible and that only a `SETTLED` result with `settlement_confirmed=1` and a non-empty blockchain reference may advance to the independent verification gate.
