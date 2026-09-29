import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  customerIdOf,
  ownOrderIds,
  statusDetail,
} from "../customer-business-statuses"

/**
 * GET /store/customers/me/order-business-statuses/:order_id
 *
 * One order's business status and history, only when the order is the
 * signed-in customer's own. Another customer's order answers 404, like an
 * order that does not exist. An own order without a status yet answers
 * `business_status: null`.
 */
export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const customerId = customerIdOf(req)
  const { order_id } = req.params
  const [own] = await ownOrderIds(req, customerId, order_id)
  if (!own)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${order_id} was not found`,
    )
  res.json({ business_status: await statusDetail(req, own) })
}
