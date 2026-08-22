import { CreateShippingMethodAdjustmentDTO } from "@medusajs/framework/types"
import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"

import { planCashOnDeliveryFee } from "../utils/cod-fee-adjustment"
import { resolveCartPaymentContext } from "../utils/resolve-cart-payment-context"

/**
 * Keeps the cash-on-delivery fee on the cart in step with the current
 * selection.
 *
 * This hook runs on every cart change, immediately BEFORE the payment
 * collection is refreshed. That ordering matters and was measured:
 * `refreshPaymentCollectionForCartWorkflow` re-queries the cart rather than
 * trusting the snapshot it is handed (`refresh-payment-collection.js`, the
 * `should-fetch-cart` branch is gated on `shouldExecute`, not on `!input.cart`),
 * so a change made here is already in `total` when the payment amount is
 * recomputed. One pass, no lag.
 *
 * Nothing happens today, on purpose: no payment provider is mapped to a role
 * yet (see `payment-providers.ts`), so the selected role is always null, the
 * fee is always zero, and the plan is always empty. The wiring is complete and
 * inert until the providers exist.
 */
refreshCartItemsWorkflow.hooks.beforeRefreshingPaymentCollection(
  async ({ input }, { container }) => {
    const cartId = (input as { cart_id?: string })?.cart_id

    if (!cartId) {
      return new StepResponse(undefined)
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: carts } = await query.graph({
      entity: "cart",
      filters: { id: cartId },
      fields: [
        "id",
        "shipping_methods.id",
        "shipping_methods.shipping_option_id",
        "shipping_methods.adjustments.id",
        "shipping_methods.adjustments.amount",
        "shipping_methods.adjustments.code",
        "shipping_methods.adjustments.provider_id",
        "payment_collection.payment_sessions.provider_id",
      ],
    })

    const cart = carts?.[0]

    if (!cart) {
      return new StepResponse(undefined)
    }

    const { cash_on_delivery_fee } = await resolveCartPaymentContext(
      cart,
      container
    )

    const plan = planCashOnDeliveryFee({
      shippingMethods: cart.shipping_methods ?? [],
      feeAmount: cash_on_delivery_fee,
    })

    if (!plan.toRemoveIds.length && !plan.toCreate.length) {
      return new StepResponse(undefined)
    }

    const cartModule = container.resolve(Modules.CART)

    if (plan.toRemoveIds.length) {
      await cartModule.softDeleteShippingMethodAdjustments(plan.toRemoveIds)
    }

    if (plan.toCreate.length) {
      // `CreateShippingMethodAdjustmentDTO` declares `code` as a REQUIRED
      // string (`types/dist/cart/mutations.d.ts`, line 709), while the model
      // declares it nullable (`cart/dist/models/shipping-method-adjustment.js`).
      // The fee must stay codeless or the promotion engine deletes it, so the
      // typed surface is narrower than the model here. One cast, at the single
      // write site, rather than loosening the types everywhere.
      await cartModule.addShippingMethodAdjustments(
        plan.toCreate as unknown as CreateShippingMethodAdjustmentDTO[]
      )
    }

    return new StepResponse(undefined)
  }
)
