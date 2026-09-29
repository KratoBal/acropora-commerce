import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"

import {
  customerIdOf,
  listStatuses,
  ownOrderIds,
} from "./customer-business-statuses"

/**
 * GET /store/customers/me/order-business-statuses
 *
 * The business status of every order of the signed-in customer. An order
 * that has no business status yet is left out.
 */
export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const customerId = customerIdOf(req)
  const orderIds = await ownOrderIds(req, customerId)
  res.json({ business_statuses: await listStatuses(req, orderIds) })
}
