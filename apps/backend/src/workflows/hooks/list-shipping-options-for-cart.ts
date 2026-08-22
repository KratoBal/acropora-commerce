import { listShippingOptionsForCartWorkflow } from "@medusajs/medusa/core-flows"

import { StepResponse } from "@medusajs/framework/workflows-sdk"

import { resolveCartShippingClass } from "../utils/resolve-cart-shipping-class"

/**
 * Injects the cart-wide scalar shipping class into the shipping-option rule
 * context for the store listing endpoint (`GET /store/shipping-options`).
 *
 * The same hook must also be registered on
 * `listShippingOptionsForCartWithPricingWorkflow` (see the sibling file):
 * they are two separate workflows with two separate hooks, and registering only
 * one makes the listed options disagree with the accepted ones.
 *
 * Both call the same resolver, so the classification exists in exactly one
 * place.
 */
listShippingOptionsForCartWorkflow.hooks.setShippingOptionsContext(
  async ({ cart }, { container }) => {
    const { shipping_class, shipping_class_source } =
      await resolveCartShippingClass(cart, container)

    return new StepResponse({ shipping_class, shipping_class_source })
  }
)
