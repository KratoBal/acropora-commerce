import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { CHANGE_BLOCK_MESSAGE, changeShippingMethod } from "../../../../../workflows/utils/order-shipping-change/change"
import { shippingChangeOperations } from "../../../../../workflows/utils/order-shipping-change/operations"
import type { AdminPostOrderShippingMethodType } from "../../validators"

/**
 * POST /admin/order-shipping/:order_id/method  { shipping_option_id, point_id?, source?, actor? }
 *
 * The order's shipping method changed (card 0a14f739, C/2), with the point in
 * the same step: `{ changed, previous_total, total, difference, payment_due,
 * payment_state }`. If `payment_due`, the OS sends the difference link
 * through `POST /admin/order-payment/:id/payment-link`. 404 / 409 / 422 / 503
 * with a Hungarian message; a rise over a mixed cart's shared hold is refused
 * by the hold rules (409, their message).
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminPostOrderShippingMethodType>, res: MedusaResponse) => {
  let result
  try {
    result = await changeShippingMethod(req.params.order_id, req.validatedBody, req.auth_context.actor_id, shippingChangeOperations(req.scope))
  } catch (error) {
    if (MedusaError.isMedusaError(error) && (error as MedusaError).type === MedusaError.Types.NOT_ALLOWED) {
      res.status(409).json({ message: (error as MedusaError).message })
      return
    }
    throw error
  }
  switch (result.status) {
    case "not_found":
      res.status(404).json({ message: "Nincs ilyen rendelés." })
      return
    case "blocked":
      res.status(409).json({ message: CHANGE_BLOCK_MESSAGE[result.reason] })
      return
    case "invalid":
      res.status(422).json({ message: result.message })
      return
    case "unavailable":
      res.status(503).json({ message: "A fuvarozó csomagpont-listája most nem érhető el, próbáld újra később." })
      return
    case "done": {
      const { status: _status, ...body } = result
      res.json(body)
    }
  }
}
