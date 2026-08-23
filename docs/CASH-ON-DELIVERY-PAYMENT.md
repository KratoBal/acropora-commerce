# Cash on delivery payment

The provider that represents paying the courier. It is the counterpart of
[Cash on delivery fee](./CASH-ON-DELIVERY-FEE.md): that document covers the
handling fee on the cart, this one covers the money.

The business rules behind it are recorded in
[the decision log](./ACROPORA-COMMERCE-DECISIONS.md), entries D-2026-08-23-24
and D-2026-08-23-25.

## What is different about this payment method

Every other payment provider talks to a system that holds money. This one does
not. Cash on delivery is a promise: the customer pays the courier, the courier
remits to us days later, and only at that moment has money moved.

The first business rule follows from that, and everything else follows from the
rule: **an order counts as paid when the money reaches us, not when the order
is created.**

Medusa has a payment session status for this shape of payment,
`pending_authorization`, described in its own source as the deferred case
(bank transfers, payment links, vouchers). Cart completion handles it
explicitly: the order is created and **no payment record is created with it**.
So the order can exist, and be honest about being unpaid.

## The provider

```
src/modules/acropora-payment     static identifier = "acropora"
medusa-config.ts                 { resolve: "./src/modules/acropora-payment", id: "cod" }
provider id                      pp_acropora_cod
```

Medusa composes the id as `pp_${identifier}_${id}`. That id is historical:
every cash-on-delivery order ever placed carries it, and it cannot be rewritten
afterwards.

It is deliberately **not** the built-in `pp_system_default`, and not a second
registration of the built-in class either (D-2026-08-23-24). The shared system
provider is the catch-all for every manual payment (bank transfer, an amount an
admin records by hand, tests), so using it would make cash-on-delivery orders
indistinguishable from those, permanently, on the orders that already exist. Its
behaviour is also fixed: it authorizes everything on the spot, which is the one
thing this provider must not do.

Adding the payment module to `medusa-config.ts` does not remove the system
provider: the module loader registers it unconditionally, before it reads the
configured providers.

## The lifecycle

```
checkout                     authorizePayment -> pending_authorization, no payment record
order created                payment status: awaiting
warehouse ships              fulfillment does not look at payment status
courier remits               a remittance is recorded on the session
acknowledgement              authorizePayment -> captured, payment and capture created
                             an order transaction appears, which is the reconciliation anchor
```

The order is fulfillable throughout. Medusa's fulfillment validation checks
that the order is not cancelled, that the items exist on it, and that they are
grouped by shipping requirement. It does not check payment. That is what lets
the warehouse work without anyone pretending the order is paid.

## Acknowledging that the money arrived

`authorizePayment` runs **twice** on the same session: once at checkout, once
when the money is acknowledged. Both calls arrive with the same shape and no
caller identity, so the only thing that can tell them apart is the session data.

That is why the provider reports the payment as received **only when a
remittance record is present on the session**, and refuses anything else:

```json
{
  "acropora_cod_remittance": {
    "reference": "GLS-2026-08-23-0042",
    "received_at": "2026-08-23"
  }
}
```

The reference is required. A capture with no traceable settlement is an amount
nobody can later match to a courier transfer.

**What this means in practice, and it is the point:** the built-in
`POST /admin/orders/:id/payment-sessions/authorize` route, which any
administrator can call, **cannot move a cash-on-delivery payment forward on its
own**. Without a recorded remittance the provider answers "still pending", the
route reports `is_authorized: false`, and nothing happens. Acknowledging
receipt requires a caller that deliberately records the settlement first, which
is the separate act the fifth business rule asks for (D-2026-08-23-25).

**What this repository does NOT yet contain:** the endpoint that records a
remittance and completes the authorization under its own permission. It is
deliberately not built here. Its required shape:

1. Accepts an order or payment session id and a settlement reference.
2. Is restricted to the role that may confirm incoming money, which is not the
   general administrator role.
3. Writes the remittance onto the payment session
   (`updatePaymentSession`, which routes through this provider's
   `updatePayment` and validates the record).
4. Runs `authorizePaymentSessionForOrderWorkflow`, which creates the payment,
   the capture and the order transaction.

Until it exists, cash-on-delivery orders can be placed and fulfilled, and they
stay `awaiting`. That is a working state, not a broken one.

## An undelivered parcel is not a refund

Three ways a cash-on-delivery order can end, and only one of them refunds:

| Ending | What happened | What it does to money |
|---|---|---|
| `remitted` | the courier collected and remitted | capture |
| `failed_delivery` | the parcel was never handed over | **nothing.** No refund: nothing was ever collected |
| `returned_after_payment` | paid, then the goods came back | refund, including the handling fee |

The provider enforces the middle row: `refundPayment` refuses on a session with
no remittance, and its message names the state, because whoever meets that error
is one click away from treating a failed delivery as a refund. Medusa's own rule
is the second line of defence: a payment cannot be refunded beyond what was
captured on it.

A failed delivery is closed as an unsuccessful order rather than deleted
(D-2026-08-23-25, third rule). What that state looks like on the Acropora OS
side is that system's own question.

## What Acropora OS needs from here

- **Reconcile against the order transaction, not the order total.** A capture
  writes a transaction with `reference: "capture"` and the capture id. Order
  totals change afterwards (returns, exchanges); a transaction does not.
- **Recognize a cash-on-delivery order by `provider_id = pp_acropora_cod`**, not
  by the shipping method and not by the presence of the fee line.
- **Recognize the fee by its metadata** (`acropora_line_item_kind: "fee"`,
  `fee_type: "cash_on_delivery"`), never by the line's title.
- **The settlement reference travels with the payment**, so a courier transfer
  can be traced to the orders it paid for.
- `payment.captured` and `payment.refunded` events are emitted, so nothing needs
  to poll.

## What still has to happen before a customer can choose it

Four things, and only the first is code:

1. the provider (this PR),
2. the `medusa-config.ts` entry (this PR),
3. **linking the provider to the region**, without which it never appears at
   checkout,
4. **setting `ACROPORA_PP_COD=pp_acropora_cod`**, without which the payment role
   stays empty and the handling fee stays zero.

If any of the last two is missing, nothing fails loudly: the fee is simply zero
and the method is simply absent. Both are deployment steps, not code.
