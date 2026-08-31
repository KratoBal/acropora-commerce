# Cash on delivery fee

The cash-on-delivery handling fee is a real, positive line item on the cart. It
is not a shipping fee, not a shipping adjustment and not a hidden surcharge:
the order is merchandise plus shipping plus the handling fee. The business rule
behind it is recorded in `ACROPORA-COMMERCE-DECISIONS.md`, entries
D-2026-08-23-20 to D-2026-08-23-22.

## Where the amount comes from

`commerce_setting.cash_on_delivery_fee_huf`, read on every call, with an
approved fallback of 450. Changing it changes the next fee that is created; no
rebuild, no deployment and no migration is involved. See
[Shipping pricing](./SHIPPING-PRICING.md) for the settings table.

The fee is charged once per order. Nothing multiplies it by quantity.

## The line

```json
{
  "title": "Utánvét kezelési díj",
  "quantity": 1,
  "unit_price": 450,
  "is_tax_inclusive": true,
  "requires_shipping": false,
  "metadata": {
    "acropora_line_item_kind": "fee",
    "fee_type": "cash_on_delivery"
  }
}
```

The metadata is the contract. Invoicing, refunds and reporting identify the fee
by the marker, never by the title, and the goods total excludes it by the same
marker, which is what keeps it out of the free-shipping threshold.

`requires_shipping` is false because a line with no variant has no shipping
profile, and cart completion demands a profile for every line that requires
shipping.

## Two places touch it, and only one of them adds

**`POST /store/payment-options`** brings a cart's fee in line with the payment
method it has selected. This is the moment of selection, and it needs its own
endpoint: creating a payment session runs `createPaymentSessionsWorkflow` and
nothing else, no payment-session workflow or step in Medusa 2.19 exposes a
hook, and none of them refreshes the cart. Choosing a payment method therefore
recalculates nothing on its own.

The request carries a cart id and nothing else. The backend reads the selected
payment method from the payment session on the cart. A flag from the storefront
saying "cash on delivery was picked", or an amount sent by the client, are both
refused by construction: neither is part of the request.

**The `beforeRefreshingPaymentCollection` hook** on `refreshCartItemsWorkflow`
runs after every cart operation and removes a fee the cart is no longer
entitled to charge. It never adds one, and it never throws. The case it exists
for is real: the customer picks cash on delivery, then switches to a heavy
delivery or store pickup, where it is not offered. That switch is a cart
operation, so the hook sees it.

It does not add, because adding would charge a customer more as a side effect
of an unrelated action, at a moment when they are not looking at the payment
step. It does not throw, because every cart operation in the store runs through
it: an error raised there would not fail the fee, it would fail adding an item
to a cart.

## The storefront has to call it, and in this order

1. The customer selects a payment method. The storefront creates the payment
   session the usual way, through the Medusa store API.
2. The storefront calls `POST /store/payment-options` with the cart id.
3. **If the response reports `selected_payment_role: null`, the payment session
   is gone and the storefront initializes it again.**

Step 3 is not a quirk of this feature. Adding or removing any line moves the
cart total, and Medusa deletes the payment sessions of a cart whose total no
longer matches its payment collection. The same thing happens when a customer
adds a product after choosing how to pay. The response reports the state after
the change rather than the state the decision was made from, so the storefront
can see it rather than infer it.

The response also names what happened:

```json
{
  "payment_options": {
    "allowed_payment_roles": ["ONLINE_CARD", "COD"],
    "selected_payment_role": null,
    "cash_on_delivery_fee": 450
  },
  "cash_on_delivery_fee_line": {
    "action": "add",
    "amount": 450,
    "removed_line_ids": [],
    "stale_amount": null,
    "reason": "Cash on delivery is selected and allowed, and the cart carries no fee yet."
  }
}
```

`GET /store/payment-options` answers what the cart owes without changing
anything. A storefront must never charge the amount on its own.

## Completion refuses a mismatch

The `validate` hook on `completeCartWorkflow` throws when a cart pays cash on
delivery without the fee, carries the fee without paying cash on delivery, or
carries more than one. This is the last moment where being wrong is still free:
past it, a missing fee is revenue that was never invoiced and a stale fee is an
overcharge on a document the customer keeps.

The repair is `POST /store/payment-options`, and the error message says so.

## A fee already on a cart is not repriced

If the configured amount changes while a cart is in checkout, the cart keeps
the amount it was charged. The customer pays what they were shown when they
chose to pay on delivery, and the new amount applies to the next cart that asks
for one. Rewriting it would move the total under a customer mid-checkout and
delete their payment session, so a routine admin price change would drop live
carts back to the payment step.

The mismatch is written to the log, and completion accepts it.

## Which tax rate the fee gets

The fee is taxed. `getItemTaxLines` filters the item list on gift cards and
nothing else, so a line with no variant is still sent to the tax provider.

What matters is what it is sent **as**. `normalizeLineItemsForTax` passes six
fields — id, product_id, product_type_id, quantity, unit_price, currency_code —
and the fee has neither a product nor a variant, so `product_id` and
`product_type_id` are undefined. A product-based or product-type-based tax rule
cannot match it. The fee gets **the region's default rate**.

The handling fee is taxed at 27%, and the region default is 27%, so today the
two agree and there is nothing to configure. **The agreement is measured, not
enforced.** Nothing ties the fee to 27: if the region default is changed, the
fee follows it silently — no error, no missing tax line, no failing test, just a
different number on the invoice.

The condition that ends this is therefore not a date but a change: the region
default moving away from 27% while the fee must stay at it. At that point the
fee needs something a tax rule can key on — a product, a product type or a tax
code — which is a modelling decision rather than a setting.

Measured 2026-08-31 by reading `@medusajs/core-flows` 2.19.0. The runtime
behaviour against a live region was not measured.

## The payment itself

This document stops at the fee. How the money is taken, when the order counts
as paid, and what happens when a parcel is never handed over are in
[Cash on delivery payment](./CASH-ON-DELIVERY-PAYMENT.md).

## The order path is watched, but only in one direction

Draft orders and admin-created orders do not go through cart completion, so the
gate above never sees them. They go through `createOrderWorkflow`, and its
`orderCreated` hook reports an order that was created carrying **more than one**
fee.

It reports and does not throw. By then the order exists, and throwing would
start compensation against an order that may already have an authorized payment
behind it — a worse failure than the duplicate it was meant to catch. The gate
is on the cart, where being wrong is still free; this is a smoke alarm.

**A missing fee cannot be detected there at all.** The hook is handed the order
as a query result whose field list is fixed in the Medusa source: addresses,
summary, items with their tax lines and adjustments, credit lines, shipping
methods, transactions, currency, total, id. There is no payment collection, no
payment session and no provider — and on a draft order the payment method often
does not exist yet. So "cash on delivery was chosen and the fee is missing" is
not knowable at that moment, by any query.

## Not covered here

Which entry point puts the fee on a draft order in the first place, and whether
an admin may waive it. Today an admin adds it by hand through the standard
draft-order item endpoint, which accepts a line with no variant, a title and a
custom price.
