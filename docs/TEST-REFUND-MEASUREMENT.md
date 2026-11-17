# Booking a test refund and reading the payment figures (card 04b6010e)

The post-measurement of #615 (`loadSide` subtracts Medusa's refunds) needs an order with a booked refund. The refund is booked inside the
test backend container by `src/scripts/book-test-refund.ts`, through the same workflow the admin route runs
(`refundPaymentWorkflow`), and the Stripe side is read over its REST API with the TEST key. No browser, no admin login, no host shell.

Test showcase only (`commerce-stage`). The script refuses unless `STRIPE_API_KEY` is a Stripe test key (`sk_test_...`) and Stripe says the
payment's intent is not live. It prints amounts, ids and statuses: never a payment's `data`, an order's metadata, an e-mail address or the
key. Every output section starts with `MEASURE-RESULT`.

## The command (one run of a one-off Coolify task on the test backend app)

The input travels in the command, as base64 JSON after `--input`: the environment of a Coolify task does not reach the run (measured
2026-11-14). In the runner image the compiled scripts are `.js` under `/app/src/scripts` (the entrypoint calls them the same way):

```bash
cd /app && npx medusa exec ./src/scripts/book-test-refund.js --input <base64>
```

Making the base64 on the fleet host (from any directory; the JSON is the only thing that changes):

```bash
cd /home/marveen/marveen && printf '%s' '{"mode":"list","limit":5}' | base64 -w0
```

## Three steps, three runs

| step | JSON | writes |
| --- | --- | --- |
| 1. pick an order | `{"mode":"list","limit":5}` | nothing |
| 2. plan | `{"mode":"plan","order_id":"order_01...","amount":100}` | nothing |
| 3. book | `{"mode":"apply","order_id":"order_01...","amount":100,"confirm_order_id":"order_01..."}` | one refund |

- **list**: the latest orders with a captured Stripe payment: order id, total, per payment captured and refunded, `refunds_field`
  (`missing` = the field is not resolved; `empty` = resolved, none booked).
- **plan** (the default mode): the readout of the order's payment figures BEFORE (`readout_before`: for each amount its type, value, and whether `Number()`
  takes it; this is the `measure-order-payments` readout), Stripe's word on the intent (`status`, `livemode`), and whether the refund may be
  booked, with every reason against it named.
- **apply**: books `amount` (a whole number of forints, at least 1) on the one Stripe payment of the order (`payment_id` names it when
  there are several), then prints `readout_after`, `loadSide`'s own reading (`other_captured`), and the refunds Stripe lists for the intent
  (`stripe_refunds`: status, amount in the smallest unit and in forints).

What decides the #615 question is in `readout_after`: `refunds_field: "present"`, each refund `type`/`finite`, `findings: []`, and
`other_captured` equal to captured minus refunded. A refund cannot be un-booked: pick a small amount (100 Ft is enough).

## What it does NOT do

- It does not book anything on a live payment, and refuses a live key. It does not touch the live shop.
- It does not release a hold or pay a difference; those steps of the mixed cart are measured by their own commands.
- Not measured against a running Medusa when this file was written (no local PostgreSQL): the pure part (input, plan) is unit-tested
  (`refund-measure.unit.spec.ts`), the script is a typechecked glue. The first run is the measurement of the script itself.
