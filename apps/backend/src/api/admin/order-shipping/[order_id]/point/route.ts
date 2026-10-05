import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  POINT_CHANGE_BLOCK_MESSAGE,
  changeOrderPoint,
  pointChangeOperations,
} from "../../../../../workflows/utils/order-point-change"
import type { AdminPostOrderPickupPointType } from "../../validators"

/**
 * POST /admin/order-shipping/:order_id/point  { point_id, source? }
 *
 * Another pickup point for the order, on the same shipping method (card
 * d3b54954, S1): price and payment do not change. 200 with the stored point
 * (`changed: false` for the same point, nothing written); 404 / 409 / 422 /
 * 503 with a Hungarian message. The old point goes into the method's
 * `metadata.acropora_point_history`.
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminPostOrderPickupPointType>, res: MedusaResponse) => {
  const result = await changeOrderPoint(
    req.params.order_id,
    req.validatedBody,
    req.auth_context.actor_id,
    pointChangeOperations(req.scope)
  )
  switch (result.status) {
    case "not_found":
      res.status(404).json({ message: "Nincs ilyen rendelés." })
      return
    case "blocked":
      res.status(409).json({ message: POINT_CHANGE_BLOCK_MESSAGE[result.reason] })
      return
    case "invalid_point":
      res.status(422).json({ message: "Ez a csomagpont ehhez a szállítási módhoz most nem választható." })
      return
    case "unavailable":
      res.status(503).json({ message: "A fuvarozó csomagpont-listája most nem érhető el, próbáld újra később." })
      return
    case "done":
      res.json({
        carrier: result.carrier,
        changed: result.changed,
        previous_point_id: result.previous_point_id,
        point: result.point,
      })
  }
}
