import { completeCartWorkflow } from "@medusajs/medusa/core-flows"

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
  const context = await resolveCartPaymentContext(cart, container)

  assertCashOnDeliveryFeeMatchesPayment({
    dueHuf: context.cash_on_delivery_fee,
    items: cart?.items,
  })
})
