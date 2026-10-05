import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { FoxpostPickupPointsService } from "../../../../../services/foxpost-pickup-points"
import { GlsPickupPointsService } from "../../../../../services/gls-pickup-points"
import {
  POINT_CHANGE_BLOCK_MESSAGE,
  currentPointId,
  loadPointOrder,
  pointChangeBlock,
  pointMethodOf,
} from "../../../../../workflows/utils/order-point-change"
import type { AdminGetOrderPickupPointsParamsType } from "../../validators"

const foxpostPickupPoints = new FoxpostPickupPointsService()
const glsPickupPoints = new GlsPickupPointsService()

/**
 * GET /admin/order-shipping/:order_id/points?q=&limit=
 *
 * The points the order's own method may go to (card d3b54954, S1), for the
 * OS's point picker: the same search and the same point shape as the
 * checkout's (`/store/foxpost/pickup-points`, `/store/gls/pickup-points`),
 * with the carrier and the current point. The order decides the carrier and
 * the heavy-goods rule, so the OS cannot pick from the wrong list. 503 while
 * the carrier's list is unavailable; 404 / 409 with a Hungarian message.
 */
export const GET = async (req: MedusaRequest<unknown, AdminGetOrderPickupPointsParamsType>, res: MedusaResponse) => {
  const { q, limit } = req.validatedQuery as AdminGetOrderPickupPointsParamsType
  const order = await loadPointOrder(req.scope, req.params.order_id)
  if (!order) {
    res.status(404).json({ message: "Nincs ilyen rendelés." })
    return
  }
  const block = pointChangeBlock(order)
  if (block) {
    res.status(409).json({ message: POINT_CHANGE_BLOCK_MESSAGE[block] })
    return
  }
  const { method, carrier, heavy } = pointMethodOf(order)!
  const answer =
    carrier === "foxpost"
      ? await foxpostPickupPoints.searchPickupPoints({ query: q, limit })
      : await glsPickupPoints.searchPickupPoints({ query: q, heavy, limit })
  res
    .status(answer.available ? 200 : 503)
    .json({ carrier, current_point_id: currentPointId(method, carrier), ...answer })
}
