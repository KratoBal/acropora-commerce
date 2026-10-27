import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"

import { saveCustomerAszfAcceptance } from "../../../../../workflows/utils/customer-aszf-record"
import type { StorePostAszfElfogadasType } from "../../../carts/[id]/aszf-elfogadas/validators"

/**
 * POST /store/customers/me/aszf-elfogadas
 *
 * The signed-in customer says they accepted the ÁSZF at registration; the
 * server writes the record on the customer (its clock, its version:
 * customer-aszf-record.ts). Written once: a repeat answers the stored record.
 * 401: the token is not bound to a customer record yet; 404: no such customer;
 * 501: the document the shop shows is not one the backend can record yet.
 * The session comes from Medusa's `/store/customers/me*` middleware.
 */
export const POST = async (
  req: MedusaStoreRequest<StorePostAszfElfogadasType>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Nincs bejelentkezett vevő." })
    return
  }
  const result = await saveCustomerAszfAcceptance(req.scope, customerId)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen vevő." })
    return
  }
  if (result.status === "unsupported_document") {
    res.status(501).json({ message: "Az ÁSZF-elfogadás rögzítése ezzel a dokumentummal még nincs bekötve." })
    return
  }
  res.json({ aszf_elfogadas: result.record })
}
