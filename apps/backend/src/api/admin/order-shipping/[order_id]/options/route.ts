import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { CHANGE_BLOCK_MESSAGE, listChangeOptions } from "../../../../../workflows/utils/order-shipping-change/change"
import { shippingChangeOperations } from "../../../../../workflows/utils/order-shipping-change/operations"

/**
 * GET /admin/order-shipping/:order_id/options
 *
 * The courier methods the order may change to (card 0a14f739, C/2), by the
 * checkout's own rules, each with the order's new fee:
 * `{ current_option_id, options: [{ id, name, amount, carrier, needs_point, heavy }] }`.
 * 404 / 409 with a Hungarian message.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const listed = await listChangeOptions(req.params.order_id, shippingChangeOperations(req.scope))
  if (listed.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen rendelés." })
    return
  }
  if (listed.status === "blocked") {
    res.status(409).json({ message: CHANGE_BLOCK_MESSAGE[listed.reason] })
    return
  }
  res.json({ current_option_id: listed.current_option_id, options: listed.options })
}
