import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { pieceHolds } from "../../../workflows/utils/cart-hold"

/**
 * GET /store/cart-holds?variant_id=…[&cart_id=…] (V2.3 S2, card 52024fc0): whether each piece is a unique piece, and
 * whether a hold stands on it (its end, and whether it is the asking cart's). The rule is `pieceHolds`; here only the
 * answer's shape. A failure answers 503 and is logged: the storefront then shows nothing, it does not guess.
 */
export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const { variant_id, cart_id } = req.validatedQuery as { variant_id: string[]; cart_id?: string }
  try {
    res.json(await pieceHolds(req.scope, variant_id, cart_id ?? null))
  } catch (error) {
    try {
      req.scope
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(`Cart hold lookup failed: ${(error as Error)?.message ?? error}`)
    } catch {
      // no logger: nothing to write
    }
    res.status(503).json({ message: "A foglalás állapota most nem kérdezhető le." })
  }
}
