import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { adminEntryView, loyaltyOperations, readLoyalty } from "../../../../workflows/utils/loyalty/loyalty"
import type { AdminGetLoyaltyParamsType } from "../validators"

/**
 * GET /admin/loyalty/:customer_id
 *
 * A customer's balance and the newest rows of the ledger (reason and actor included: the OS is the staff's view).
 * 404: no such customer.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.validatedQuery as AdminGetLoyaltyParamsType
  const result = await readLoyalty(loyaltyOperations(req.scope), req.params.customer_id, { limit: query.limit, checkCustomer: true })
  if (result.status === "customer_not_found") {
    res.status(404).json({ type: "not_found", message: "Nincs ilyen vevő." })
    return
  }
  res.json({ customer_id: req.params.customer_id, balance: result.balance, entries: result.entries.map(adminEntryView) })
}
