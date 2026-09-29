import {
  calculateShippingOptionsPricesWorkflow,
  listShippingOptionsForCartWithPricingWorkflow,
} from "@medusajs/medusa/core-flows"

import { StepResponse } from "@medusajs/framework/workflows-sdk"

import { loadCartShippingDecision } from "../utils/load-cart-shipping-decision"
import { SPLIT_LINE_IDS_CONTEXT_KEY } from "../utils/split-pricing-context"

/**
 * Tells the shipping provider which lines are split off into the pickup order
 * (P4-2), so a courier price and its free-shipping threshold are computed from
 * the courier lines only (Balázs, 2026-09-29).
 *
 * Registered on BOTH pricing paths: the store's price query
 * (`calculateShippingOptionsPricesWorkflow`, what the checkout shows) and the
 * listing that `addShippingMethodToCartWorkflow` and the refresh run (what the
 * cart is charged). One without the other would show one price and charge
 * another.
 */
const splitLineContext = async (
  cartId: unknown,
  container: { resolve: (key: string) => any }
) => {
  if (typeof cartId !== "string" || !cartId) {
    return new StepResponse({})
  }

  const decision = await loadCartShippingDecision(cartId, container)

  return new StepResponse({
    [SPLIT_LINE_IDS_CONTEXT_KEY]: decision?.split_line_ids ?? [],
  })
}

calculateShippingOptionsPricesWorkflow.hooks.setCalculatedShippingPricingContext(
  async ({ input }, { container }) =>
    splitLineContext((input as { cart_id?: unknown })?.cart_id, container)
)

listShippingOptionsForCartWithPricingWorkflow.hooks.setCalculatedShippingPricingContext(
  async ({ input }, { container }) =>
    splitLineContext((input as { cart_id?: unknown })?.cart_id, container)
)
