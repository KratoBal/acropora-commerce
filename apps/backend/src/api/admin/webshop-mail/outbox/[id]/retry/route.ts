import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { requeueWebshopMail } from "../../../../../../workflows/utils/webshop-mail/deliver"

/**
 * POST /admin/webshop-mail/outbox/:id/retry
 *
 * A stuck mail back in line, after its template was mended in the OS
 * (nautilus 26563). 200: the row, due now (`StuckMail`); the outbox job sends
 * it within two minutes. 404: no such mail; 409: it has gone already.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const result = await requeueWebshopMail(req.scope, req.params.id)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen levél a webshop levél-sorában." })
    return
  }
  if (result.status === "sent") {
    res.status(409).json({ message: "Ez a levél már kiment, nem kell újra sorba tenni." })
    return
  }
  res.json(result.item)
}
