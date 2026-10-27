import { MedusaError } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"

import { guardAszf } from "../utils/aszf-guard"
import { assertCartNotMixed } from "../utils/assert-cart-not-mixed"
import { assertCardShare } from "../utils/assert-card-share"
import { assertCashOnDeliveryFeeMatchesPayment } from "../utils/cod-fee-reconciliation"
import { resolveCartPaymentContext } from "../utils/resolve-cart-payment-context"

/**
 * Refuses to turn a cart into an order while its fee lines disagree with its
 * payment method.
 *
 * This is the one place in the flow that throws, and it is the last one where
 * throwing is still free. Up to here a mismatch is a cart the customer is
 * still holding, and the store endpoint repairs it. Past here it is an order:
 * a missing fee is revenue that was never invoiced, and a fee that is no
 * longer due is an overcharge on a document the customer keeps.
 *
 * The hook validates and does not touch the cart. Medusa is explicit that line
 * items and totals must not be mutated in this hook, and the payment session
 * has already been chosen against a total by the time it runs, so silently
 * changing that total here would authorize a different amount than the one the
 * customer approved.
 */
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  // The ÁSZF net under EVERY way of placing an order (audit A4): the stock
  // `/complete` route, both halves of `complete-split`, anything later. The
  // card path keeps its exception (aszf-guard.ts): its record was required
  // when the session was made.
  const aszf = guardAszf(
    {
      metadata: (cart?.metadata as Record<string, unknown> | null | undefined) ?? null,
      sessions: (cart?.payment_collection?.payment_sessions ?? [])
        .filter(Boolean)
        .map((session) => ({
          provider_id: session?.provider_id ?? null,
          status: session?.status ?? null,
        })),
    },
    "place_order"
  )
  if (aszf.action === "refuse") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, aszf.message)
  }

  // A workflow hook takes one handler, so the P4-2 check lives here too: a
  // mixed cart is completed as two orders, never as one.
  await assertCartNotMixed(cart, container)
  // And the P4-3c one: a card payment covers exactly this cart, or this cart
  // and its split pair together.
  await assertCardShare(cart.id, container)

  const context = await resolveCartPaymentContext(cart, container)

  assertCashOnDeliveryFeeMatchesPayment({
    dueHuf: context.cash_on_delivery_fee,
    items: cart?.items,
  })
})
