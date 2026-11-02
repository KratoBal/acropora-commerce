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
 * 503: the Fogyasztóbarát switch is on but the Hungarian shop id is not set.
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
  const result = await saveCustomerAszfAcceptance(req.scope, customerId, { verzio: req.validatedBody.megjelenitett_verzio, nyelv: req.validatedBody.nyelv })
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen vevő." })
    return
  }
  if (result.status === "version_mismatch") {
    res.status(409).json({
      code: "aszf_version_mismatch",
      message: "A kirakat más ÁSZF-verziót mutatott, mint amit a rendszer rögzítene, ezért az elfogadás nem rögzíthető.",
    })
    return
  }
  if (result.status === "language_unsupported") {
    res.status(409).json({
      code: "aszf_language_unsupported",
      message: "Az ÁSZF elfogadásának rögzítése ezen a nyelven még nincs bekötve.",
    })
    return
  }
  if (result.status === "not_configured") {
    res.status(503).json({ message: "Az ÁSZF dokumentuma még nincs beállítva, az elfogadás nem rögzíthető." })
    return
  }
  res.json({ aszf_elfogadas: result.record })
}
