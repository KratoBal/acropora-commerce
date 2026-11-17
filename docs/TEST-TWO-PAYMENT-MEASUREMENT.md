# Test measurement: an order with a card hold plus a difference paid through the link, then a refund

Commerce card c46502c8 (the open half: a two-payment order on the test showcase), task `t-20261117-ketfizetesu-meres`; the sibling of
[`TEST-REFUND-MEASUREMENT.md`](./TEST-REFUND-MEASUREMENT.md). That measurement has ONE live payment, where `loadSide`'s `other_captured` is 0 by
design and proves nothing. This one makes the order that does: two live payments, so `other_captured` is the sum of what the OTHER payment still
covers (captures less refunds), and a refund of the difference must lower it.

Test showcase only. `scripts/two-payment-measure.py` refuses any backend host but `commerce-stage.acropora.hu`, any Stripe key but `pk_test_...`
and a Medusa key that is a Stripe key. No browser, no Coolify task, no new endpoint: it calls the showcase's own Store and Admin routes and the
Stripe TEST API (`pm_card_visa`, what Stripe.js does with the publishable key and the client secret). Standard library only.

## The chain it runs

| Step | Call | Expected |
| --- | --- | --- |
| 1 | Store API: region, products, cart, line, address, shipping method, `POST /store/carts/:id/aszf-elfogadas` | cart ready |
| 2 | `POST /store/carts/:id/stripe-start`, Stripe confirm, `POST /store/carts/:id/complete-split` | ONE order, ONE live payment, nothing captured (the hold) |
| 3 | `POST /admin/order-edits`, `/:id/items` (another variant), `/request`, `/confirm` (`:id` is the ORDER id) | the total is above the hold; the hold stays (`order-edit-confirm-keeps-hold.ts`) |
| 4 | `POST /admin/order-payment/:order_id/payment-link` `{notify_customer:false}` | `link_sent`, amount = the difference; no mail |
| 5 | `POST /store/order-payment/:token/session`, Stripe confirm, `POST /store/order-payment/:token/complete` | `paid`; the difference captured, the hold not |
| 6 | `GET /admin/refund-measure?order_id=...` | two live payments; `other_captured` = the difference |
| 7 | `POST /admin/payments/:payment_id/refund` on the difference payment, then the same GET | `other_captured` = difference less the refund; Stripe refund `succeeded` |

The link is the shop's OWN signed page (`pay-by-link.ts`), not a Stripe Payment Link; the token is the last part of the link's URL and is never
printed. A difference arises for any order whose total goes above its hold after an edit; a mixed cart is not needed.

## Running it (acrobot runs it: the admin key is read from its file, by environment variable)

```bash
# 1. the public keys, once. The storefront sits behind basic auth (the file is user on line 1, password on line 2). With the admin key in the
#    environment too, the Medusa key is found through the admin API (all pages of the listing, then proven through the Store API: regions and a
#    buyable catalog answer under it); the title never decides, the stage lists 20+ keys that are mostly "Default Publishable API Key".
#    The admin key goes to the backend host only, the storefront login to the storefront host only.
cd <repository root> && MEDUSA_STAGE_ADMIN_KEY="$(cat /home/marveen/marveen/store/.medusa-stage-admin-key)" STAGE_BASIC_AUTH="$(sed -n 1p /home/marveen/marveen/store/.stage-basic-auth):$(sed -n 2p /home/marveen/marveen/store/.stage-basic-auth)" python3 scripts/two-payment-measure.py keys

# 2. the settings of the next calls (the two public keys come from step 1)
export MEDUSA_STAGE_ADMIN_KEY="$(cat /home/marveen/marveen/store/.medusa-stage-admin-key)"
export MEDUSA_PUBLISHABLE_KEY=pk_...   STRIPE_PUBLISHABLE_KEY=pk_test_...

# 3. read only, plus one probe that cannot write (a payment link for an order that does not exist): is the link configured on the backend?
cd <repository root> && python3 scripts/two-payment-measure.py plan

# 4. the three write steps in a row (or `hold`, then `difference --order order_01...`, then `refund --order order_01... [--amount 100]`)
cd <repository root> && python3 scripts/two-payment-measure.py all --execute [--amount 100]

# 5. the state of any order again
cd <repository root> && python3 scripts/two-payment-measure.py state --order order_01...
```

A write job without `--execute` only says what it would do. Every line is `OK`, `FAIL` or `NOTE`; the last line is `RESULT PASS` or `RESULT FAIL`
(exit 0 or 1; exit 2 is a refusal before anything was sent). A failed run prints the order id (`ORDER order_01...`) so it can be continued with
`difference` or `state`. A failed edit step names the cancel (`DELETE /admin/order-edits/:order_id`).

## What is NOT measured (until the first real run)

- The ASZF version the server records: the script tries `teszt-mod` and `unas-shop-2026-09-29` (and `--aszf-version`, repeatable, first). If the
  Fogyasztóbarát switch is on, pass `fogyasztobarat-<shop id>`.
- The checkout sequence and the shipping-option acceptance on the live backend; the Stripe confirm with the test card (`return_url` is sent, in case
  the intent allows redirects); that Medusa takes the confirmed intent as authorized without the webhook (the code says it does).
- Whether the payment link setting (`ACROPORA_PAYMENT_LINK_SECRET`, `ACROPORA_STOREFRONT_URL`) is on the test backend: `plan` says.
- The tests use a fake network written from the routes' code, so they prove the script's own rules, not the real answers.

Tests: `cd <repository root> && python3 -m unittest scripts/test_two_payment_measure.py` (by hand, like the refund helper's; the CI does not run them).

## The Stripe test publishable key: where it can and cannot be found (read from the code, NOT measured on the stage)

`keys` scans the HTML and the scripts the pages `/hu`, `/hu/cart` and `/hu/checkout` list. The Stripe key is inlined from `NEXT_PUBLIC_STRIPE_KEY` (or
`NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY`) by `apps/storefront/src/lib/util/stripe-kulcs.ts` into the card field's client code (`payment-wrapper`), which only the
checkout and the "Rendelés fizetése" pages load. Two things in the repository make "none found" the expected answer:

- `/hu/checkout` answers 307 without a cart (first real run), so its scripts are not listed;
- `apps/storefront/Dockerfile` and `infra/docker-compose.yml` declare `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` as a build argument and NOT `NEXT_PUBLIC_STRIPE_KEY`: a build from
  these files carries no Stripe key at all, unless the Coolify build injects it. Whether it does is a Coolify setting this script cannot read.

So the Stripe `pk_test_...` is taken from where it lives (the Coolify environment of the storefront, or the Stripe test dashboard) and exported as `STRIPE_PUBLISHABLE_KEY`.
