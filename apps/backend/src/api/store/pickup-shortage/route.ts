import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { pickupShortLinesOfCart } from "../../../workflows/utils/pickup-shortage-of-cart"

/**
 * GET /store/pickup-shortage?cart_id=…&location_id=… (V2.5 slice B, card ffa5d8c6): the cart lines that have no stock at the
 * pickup location, so the shipping step can say WHICH item blocks "Bolti átvétel". The rule is `shortLinesAt`; here only the
 * answer's shape. A failure answers 503 and is logged: the storefront then shows the general sentence, it does not guess.
 */
export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const { cart_id, location_id } = req.validatedQuery as { cart_id: string; location_id: string }
  try {
    res.json({ lines: await pickupShortLinesOfCart(req.scope, cart_id, location_id) })
  } catch (error) {
    try {
      req.scope
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(`Pickup shortage lookup failed: ${(error as Error)?.message ?? error}`)
    } catch {
      // no logger: nothing to write
    }
    res.status(503).json({ message: "A bolti átvétel készlete most nem kérdezhető le." })
  }
}
