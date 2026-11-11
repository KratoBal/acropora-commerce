import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"

import { saveCustomerCookieConsent } from "../../../../../workflows/utils/customer-cookie-consent"
import type { StorePostSutiHozzajarulasType } from "./validators"

/**
 * POST /store/customers/me/suti-hozzajarulas
 *
 * The signed-in customer's cookie decision; the server writes it on the
 * customer with its own clock (customer-cookie-consent.ts). Overwritten by the
 * next decision. 401: the token is not bound to a customer record; 404: no
 * such customer. The session comes from Medusa's `/store/customers/me*`
 * middleware.
 */
export const POST = async (
  req: MedusaStoreRequest<StorePostSutiHozzajarulasType>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Nincs bejelentkezett vevő." })
    return
  }
  const result = await saveCustomerCookieConsent(req.scope, customerId, req.validatedBody)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen vevő." })
    return
  }
  res.json({ suti_hozzajarulas: result.record })
}
