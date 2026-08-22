import { listShippingOptionsForCartWithPricingWorkflow } from "@medusajs/medusa/core-flows"

import { StepResponse } from "@medusajs/framework/workflows-sdk"

import { resolveCartShippingClass } from "../utils/resolve-cart-shipping-class"

/**
 * The pricing variant of the listing workflow. This is the one that
 * `addShippingMethodToCartWorkflow` and `refreshCartShippingMethodsWorkflow`
 * run, so without this registration a customer could still attach an option
 * that the store listing had already filtered out, and an incompatible method
 * would never be revalidated away after a cart change.
 */
listShippingOptionsForCartWithPricingWorkflow.hooks.setShippingOptionsContext(
  async ({ cart }, { container }) => {
    const { shipping_class, shipping_class_source } =
      await resolveCartShippingClass(cart, container)

    return new StepResponse({ shipping_class, shipping_class_source })
  }
)
