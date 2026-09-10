# NEO Counter lightweight checkout widgets

Retail sites should not embed the full NEO Counter merchant terminal. Load the public widget bundle once, then use the web components below. The widget cart stores only product/cart metadata in the shopper's browser. Payment execution still opens NEO Counter, with `https://holytemples.org/checkout/` stamped as the official checkout origin.

## Load once

```html
<script src="https://shemsizedek.github.io/neo-system/neo-counter/widgets/neo-counter.js" defer></script>
```

## Add-to-cart button

```html
<neo-counter-buy
  cart-id="temple-store"
  item-id="book-001"
  sku="BOOK-001"
  name="The Templist Scroll"
  amount-cents="2888"
  label="Add to cart">
</neo-counter-buy>
```

## Cart / basket

```html
<neo-counter-cart
  cart-id="temple-store"
  merchant="World Temple Store"
  service="world-temple-store"
  currency="USD"
  title="Your cart"
  checkout-label="Checkout with NEO Counter">
</neo-counter-cart>
```

## One-click checkout widget

```html
<neo-counter-checkout
  amount-cents="5000"
  service="example-service"
  description="Example order"
  currency="USD"
  label="Pay $50.00">
</neo-counter-checkout>
```

## JavaScript API

```js
const cart = window.NEOCounterWidgets.cart('temple-store');
cart.add({ id: 'book-001', name: 'The Templist Scroll', sku: 'BOOK-001', amountCents: 2888, qty: 1 });
cart.checkout({ merchant: 'World Temple Store', service: 'world-temple-store', currency: 'USD' });
```

The public widget is intentionally retail-only. Merchant catalog administration, staff permissions, CRM views, devices, reports, sync, and settings remain inside the authenticated NEO Counter terminal.
