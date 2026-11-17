# Booking a test refund and reading the payment figures (card 04b6010e)

The post-measurement of #615 (`loadSide` subtracts Medusa's refunds) needs an order with a booked refund. The refund is booked inside the
test backend container by `src/scripts/book-test-refund.ts`, through the same workflow the admin route runs
(`refundPaymentWorkflow`), and the Stripe side is read over its REST API with the TEST key. No browser, no admin login, no host shell.

Test showcase only (`commerce-stage`). The script refuses unless `STRIPE_API_KEY` is a Stripe test key (`sk_test_...`) and Stripe says the
payment's intent is not live. It prints amounts, ids and statuses: never a payment's `data`, an order's metadata, an e-mail address or the
key. Every output section starts with `MEASURE-RESULT`.

**The result is READ OVER HTTP, not from the task's log** (first stage run, 2026-11-17: the Coolify task API gives no log, only success or
failed, and every failed task notifies the owner). The task only books; the evidence is the state, read with
`GET /admin/refund-measure` (below), as often as needed.

## The command (one run of a one-off Coolify task on the test backend app)

The input travels in the command, as base64 JSON, **as ONE bare word after the script path**. Not `--input <base64>`: the Medusa CLI runs in
yargs strict mode and its `exec [file] [args..]` declares no options, so `--input` is refused as `Unknown argument: input` before the script
loads (exit 1 after about 4.8 s: the first stage run, reproduced locally without a database). Only positional words reach the script. The
environment of a Coolify task does not reach the run either (measured 2026-11-14), so the command line is the carrier. In the runner image
the compiled scripts are `.js` under `/app/src/scripts` (the entrypoint calls them the same way). The trailing `|| true` makes the task
always exit 0, so a failure does not notify the owner (a failure then shows as the state not changing):

```bash
cd /app && npx medusa exec ./src/scripts/book-test-refund.js <base64> || true
```

Making the base64 on the fleet host (from any directory; the JSON is the only thing that changes), or the ready commands with
`scripts/refund-measure-helper.py inputs` (below):

```bash
cd /home/marveen/marveen && printf '%s' '{"mode":"list","limit":5}' | base64 -w0
```

## Reading the state: `GET /admin/refund-measure`

Read only, admin only (the test showcase's secret API key works like for any `/admin` route), and it REFUSES unless `STRIPE_API_KEY` is a
Stripe TEST key. It books nothing and carries no payment `data`, order metadata, e-mail address, Stripe intent id or key.

| request                                          | answer (`{"sections":[{"section":...,"value":...}]}`)                                                                                                                                                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/refund-measure?limit=5`              | `list`: the latest orders with a captured Stripe payment (what the script's list mode prints)                                                                                                                                                                   |
| `GET /admin/refund-measure?order_id=order_01...` | `state`: the order's payment figures as Medusa returns them (`readout`: type, value and finiteness of every amount, `findings`), `loadSide`'s own reading (`side`: `other_captured`), and per live Stripe payment Stripe's `stripe_intent` and `stripe_refunds` |

## Three steps, three runs

| step             | JSON                                                                                      | writes     |
| ---------------- | ----------------------------------------------------------------------------------------- | ---------- |
| 1. pick an order | `{"mode":"list","limit":5}`                                                               | nothing    |
| 2. plan          | `{"mode":"plan","order_id":"order_01...","amount":100}`                                   | nothing    |
| 3. book          | `{"mode":"apply","order_id":"order_01...","amount":100,"confirm_order_id":"order_01..."}` | one refund |

- **list**: the latest orders with a captured Stripe payment: order id, total, per payment captured and refunded, `refunds_field`
  (`missing` = the field is not resolved; `empty` = resolved, none booked).
- **plan** (the default mode): the readout of the order's payment figures BEFORE (`readout_before`: for each amount its type, value, and whether `Number()`
  takes it; this is the `measure-order-payments` readout), Stripe's word on the intent (`status`, `livemode`), and whether the refund may be
  booked, with every reason against it named.
- **apply**: books `amount` (a whole number of forints, at least 1) on the one Stripe payment of the order (`payment_id` names it when
  there are several), then prints `readout_after`, `loadSide`'s own reading (`other_captured`), and the refunds Stripe lists for the intent
  (`stripe_refunds`: status, amount in the smallest unit and in forints). The same figures are in the `state` of the GET route afterwards:
  read them there.

What decides the #615 question is in `readout_after`: `refunds_field: "present"`, each refund `type`/`finite` (a number `Number()` takes), and
`findings: []`. A refund cannot be un-booked: pick a small amount (100 Ft is enough).

**`other_captured` is evidence only on an order with TWO live payments** (the hold and a difference paid through a link; correction of the
first version of this file). `loadSide` takes the hold (the uncaptured, earlier payment, else the first live one) as the order's own
payment and sums what the OTHER live payments still cover (captures minus refunds). On an order with ONE live payment `other_captured`
is 0 whatever is refunded: that is by design, not a failure, and it does not test the refund subtraction. There the shape checks above
are the whole decision. To see the subtraction itself, refund the difference payment of a two-payment order (name it as `payment_id`):
`other_captured` must then equal what that payment still covers (captured minus refunded).

## Ready commands and reading the log (`scripts/refund-measure-helper.py`)

Python 3 standard library, no install, writes and sends nothing. It builds the task commands (the bare-word input, `|| true`) and the URLs of
the read route, and reads the route's JSON answer (or a task log, if one is ever readable); it repeats the backend's input rules, so a typo is
refused before a Coolify run is spent on it.

```bash
cd <repository root> && python3 scripts/refund-measure-helper.py inputs
cd <repository root> && python3 scripts/refund-measure-helper.py inputs --order order_01... --amount 100 [--payment pay_01...]
cd <repository root> && python3 scripts/refund-measure-helper.py read answer.json      # or: ... read - < answer.json (a task log works the same)
```

`inputs` prints the three task commands and the two GET URLs; the list command needs no order, the plan and apply commands need the order id the list found. `read` prints, per section:
the list with the orders that carry two live payments marked, the plan with every reason against booking, and for `after` a line per check
(`OK` / `FAIL`, and a `NOTE` where a number proves nothing, as `other_captured` on a one-payment order). A marker line the log viewer cut
or wrapped is counted and warned about, never skipped silently: a partial log is not a result.

Tests: `cd <repository root> && python3 -m unittest scripts/test_refund_measure_helper.py`. They run by hand, not
in the CI (the workflow file is not editable by the fleet key).

## What it does NOT do

- It does not book anything on a live payment, and refuses a live key. It does not touch the live shop.
- It does not release a hold or pay a difference; those steps of the mixed cart are measured by their own commands.
- Not measured against a running Medusa when this file was written (no local PostgreSQL): the pure parts (input, plan, the readers, the route
  with a fake container and a faked Stripe) are unit-tested (`refund-measure.unit.spec.ts`, `refund-measure-read.unit.spec.ts`, the route
  spec), the script and the route are typechecked glue. What WAS run: the Medusa CLI with the `--input` form (refused, exit 1, 4.8 s) and with
  the bare word (passes the CLI and reaches the script loading; locally the file was absent, so "File ... doesn't exist" was the expected
  answer). The first successful run on the test showcase is the measurement of the script and the route themselves.
