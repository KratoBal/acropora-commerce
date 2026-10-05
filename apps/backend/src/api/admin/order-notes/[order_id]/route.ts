import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { saveOrderNotes } from "../../../../workflows/utils/order-notes"
import type { AdminPostOrderNotesType } from "../validators"

/**
 * POST /admin/order-notes/:order_id
 *
 * The order page's two note pencils (Figma 494:386, "Vevő megjegyzése",
 * "Szállítónak"). Answers the notes as stored. 404: no such order; 409: the
 * courier note after the label is out.
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminPostOrderNotesType>, res: MedusaResponse) => {
  const result = await saveOrderNotes(req.scope, req.params.order_id, req.validatedBody, req.auth_context.actor_id)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen rendelés." })
    return
  }
  if (result.status === "label_out") {
    res.status(409).json({ message: "A csomag már feladásra került, a szállítónak szóló megjegyzés nem módosítható." })
    return
  }
  res.json(result.notes)
}
