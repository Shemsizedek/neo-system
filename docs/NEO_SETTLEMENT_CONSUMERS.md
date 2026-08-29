# NEO Settlement Consumers

NEO service frontends may display a NEO Counter return result, but a browser return is not payment proof.

A service may advance an order to a verification gate only when the returned result reports:

- `settlement_state=SETTLED`
- `settlement_confirmed=1`
- a non-empty blockchain `reference`

The receiving service must then independently resolve that reference against the appropriate Bitcoin or Counterparty read-only data source and enforce its own confirmation, amount, asset, destination, replay, and order-correlation policy before irreversible fulfillment.

Current consumers include the shared root-app checkout shell and NEO Exchange. Private keys and signing remain outside this consumer layer.
