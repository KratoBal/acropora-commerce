import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { saveCartNotes } from "../../../../workflows/utils/order-notes"
import type { StorePostCartNotesType } from "../validators"

/**
 * POST /store/cart-notes/:cart_id
 *
 * The checkout's two notes (to the shop, to the courier) onto the cart, which
 * carries them to the order. Only these two keys; the cart's other metadata
 * stays out of the browser's reach. 404: no such cart; 409: already ordered.
 */
export const POST = async (req: MedusaRequest<StorePostCartNotesType>, res: MedusaResponse) => {
  const result = await saveCartNotes(req.scope, req.params.cart_id, req.validatedBody)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen kosár." })
    return
  }
  if (result.status === "completed") {
    res.status(409).json({ message: "Ebből a kosárból már rendelés lett, a megjegyzés a rendelésen módosítható." })
    return
  }
  res.json(result.notes)
}
