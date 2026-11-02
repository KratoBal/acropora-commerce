import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { saveAszfAcceptance } from "../../../../../workflows/utils/aszf-record"
import type { StorePostAszfElfogadasType } from "./validators"

/**
 * POST /store/carts/:id/aszf-elfogadas
 *
 * The customer accepts the ÁSZF; the server writes the record on the cart
 * (its clock, its version: aszf-record.ts). 404: no such cart; 409: already
 * ordered or the shop showed another version than the server records (code
 * aszf_version_mismatch) or the language is not wired (aszf_language_unsupported);
 * 503: the Fogyasztóbarát switch is on but the Hungarian shop id is not set,
 * so there is no document to record. Access is the stock cart write's: the cart id is the capability.
 */
export const POST = async (
  req: MedusaRequest<StorePostAszfElfogadasType>,
  res: MedusaResponse
) => {
  const result = await saveAszfAcceptance(req.scope, req.params.id, { verzio: req.validatedBody.megjelenitett_verzio, nyelv: req.validatedBody.nyelv })
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen kosár." })
    return
  }
  if (result.status === "completed") {
    res.status(409).json({ message: "Ebből a kosárból már rendelés lett, az elfogadás nem módosítható." })
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
