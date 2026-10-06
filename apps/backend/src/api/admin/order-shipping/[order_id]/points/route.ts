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
import {
  CHANGE_BLOCK_MESSAGE,
  listChangeOptions,
} from "../../../../../workflows/utils/order-shipping-change/change"
import { shippingChangeOperations } from "../../../../../workflows/utils/order-shipping-change/operations"
import type { AdminGetOrderPickupPointsParamsType } from "../../validators"

const foxpostPickupPoints = new FoxpostPickupPointsService()
const glsPickupPoints = new GlsPickupPointsService()

/**
 * GET /admin/order-shipping/:order_id/points?q=&limit=[&option_id=]
 *
 * With `option_id` (C/2, nautilus 26644): the list of the method the order is
 * changing TO, by that method's carrier and heavy-goods rule; 422 if it is not
 * a point method the order may change to.
 *
 * The points the order's own method may go to (card d3b54954, S1), for the
 * OS's point picker: the same search and the same point shape as the
 * checkout's (`/store/foxpost/pickup-points`, `/store/gls/pickup-points`),
 * with the carrier and the current point. The order decides the carrier and
 * the heavy-goods rule, so the OS cannot pick from the wrong list. 503 while
 * the carrier's list is unavailable; 404 / 409 with a Hungarian message.
 */
export const GET = async (req: MedusaRequest<unknown, AdminGetOrderPickupPointsParamsType>, res: MedusaResponse) => {
  const { q, limit, option_id } = req.validatedQuery as AdminGetOrderPickupPointsParamsType
  if (option_id) {
    // the list of the method the order is changing to (C/2): that method's carrier and rule
    const listed = await listChangeOptions(req.params.order_id, shippingChangeOperations(req.scope))
    if (listed.status === "not_found") {
      res.status(404).json({ message: "Nincs ilyen rendelés." })
      return
    }
    if (listed.status === "blocked") {
      res.status(409).json({ message: CHANGE_BLOCK_MESSAGE[listed.reason] })
      return
    }
    const target = listed.options.find((o) => o.id === option_id)
    if (!target?.needs_point) {
      res.status(422).json({ message: "Ez a szállítási mód ehhez a rendeléshez nem csomagpontos, vagy nem választható." })
      return
    }
    const answer =
      target.carrier === "foxpost"
        ? await foxpostPickupPoints.searchPickupPoints({ query: q, limit })
        : await glsPickupPoints.searchPickupPoints({ query: q, heavy: target.heavy, limit })
    const current = listed.current_option_id === option_id ? await loadPointOrder(req.scope, req.params.order_id) : null
    const currentMethod = current ? pointMethodOf(current) : null
    res.status(answer.available ? 200 : 503).json({
      carrier: target.carrier,
      current_point_id: currentMethod ? currentPointId(currentMethod.method, currentMethod.carrier) : null,
      ...answer,
    })
    return
  }
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
