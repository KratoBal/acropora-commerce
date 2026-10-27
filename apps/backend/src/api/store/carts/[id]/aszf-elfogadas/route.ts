import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { saveAszfAcceptance } from "../../../../../workflows/utils/aszf-record"
import type { StorePostAszfElfogadasType } from "./validators"

/**
 * POST /store/carts/:id/aszf-elfogadas
 *
 * The customer accepts the ÁSZF; the server writes the record on the cart
 * (its clock, its version: aszf-record.ts). 404: no such cart; 409: already
 * ordered; 501: the document the shop shows is not one the backend can record
 * yet. Access is the stock cart write's: the cart id is the capability.
 */
export const POST = async (
  req: MedusaRequest<StorePostAszfElfogadasType>,
  res: MedusaResponse
) => {
  const result = await saveAszfAcceptance(req.scope, req.params.id)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen kosár." })
    return
  }
  if (result.status === "completed") {
    res.status(409).json({ message: "Ebből a kosárból már rendelés lett, az elfogadás nem módosítható." })
    return
  }
  if (result.status === "unsupported_document") {
    res.status(501).json({ message: "Az ÁSZF-elfogadás rögzítése ezzel a dokumentummal még nincs bekötve." })
    return
  }
  res.json({ aszf_elfogadas: result.record })
}
