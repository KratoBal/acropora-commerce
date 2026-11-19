import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { loyaltyOperations, readLoyalty, storeEntryView } from "../../../../../workflows/utils/loyalty/loyalty"
import type { StoreGetLoyaltyParamsType } from "./validators"

/**
 * GET /store/customers/me/loyalty
 *
 * The signed-in customer's own points: the balance and the newest rows. The customer is the session's (the stock
 * /store/customers/me* middleware requires it); no id is taken from the request. The rows carry no reason and no actor.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ type: "unauthorized", message: "Be kell jelentkezni." })
    return
  }
  const query = req.validatedQuery as StoreGetLoyaltyParamsType
  const result = await readLoyalty(loyaltyOperations(req.scope), customerId, { limit: query.limit, checkCustomer: false })
  if (result.status !== "ok") {
    res.status(404).json({ type: "not_found", message: "Nincs ilyen vevő." })
    return
  }
  res.json({ balance: result.balance, entries: result.entries.map(storeEntryView) })
}
