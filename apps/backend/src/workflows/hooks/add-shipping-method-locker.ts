import { addShippingMethodToCartWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"

import { GlsPickupPointsService } from "../../services/gls-pickup-points"
import {
  LOCKER_UNSUITABLE_MESSAGE,
  cartIsShopOnly,
} from "../utils/locker-rule"
import { glsPointOptionOf } from "../utils/shipping-option-roles"

const glsPickupPoints = new GlsPickupPointsService()

/**
 * THE GLS POINT IS REFUSED WHEN IT IS CHOSEN, NOT ONLY AT THE END (a82ed229).
 *
 * A cart with an item that does not fit a parcel locker may use the ordinary
 * GLS pickup point option, but only with a parcel shop (`locker-rule.ts`). The
 * completion check would catch a locker too, but only after the customer had
 * filled in the payment; here the choice itself fails, with the reason. The
 * browser sends only the point id, so the point's type comes from our own copy
 * of GLS's list, as in the fulfillment provider. A point that is not in the
 * list is left to the provider, which refuses it with its own message.
 */
addShippingMethodToCartWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  const glsOptions = (input.options ?? []).filter((option) => {
    const gls = glsPointOptionOf(option.id)
    return gls && !gls.heavy
  })
  if (!glsOptions.length) return
  if (!(await cartIsShopOnly(cart as never, container))) return

  for (const option of glsOptions) {
    const chosen = (option.data as Record<string, unknown> | undefined)?.gls_pickup_point
    const id = chosen && typeof chosen === "object" ? Reflect.get(chosen, "id") : undefined
    if (typeof id !== "string") continue
    const point = await glsPickupPoints.findPickupPoint(id)
    if (point && point.type !== "parcel-shop") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, LOCKER_UNSUITABLE_MESSAGE)
    }
  }
})
