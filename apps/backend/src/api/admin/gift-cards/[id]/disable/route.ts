import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { GIFT_CARD_FIELDS, publicGiftCard, resolveGiftCards } from "../../helpers"

/** Disables a card: it cannot pay any more; its balance and ledger stay (card 495c0007). */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveGiftCards(req.scope)
  await service.disableGiftCard(req.params.id)
  const card = await service.retrieveGiftCard(req.params.id, { select: [...GIFT_CARD_FIELDS] })
  res.json({ gift_card: publicGiftCard(card) })
}
