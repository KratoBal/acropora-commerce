import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { GIFT_CARD_FIELDS, publicGiftCard, resolveGiftCards } from "../helpers"

/** One card with its ledger, oldest first (card 495c0007). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = resolveGiftCards(req.scope)
  const card = await service.retrieveGiftCard(req.params.id, { select: [...GIFT_CARD_FIELDS] })
  const transactions = await service.listGiftCardTransactions(
    { gift_card_id: card.id },
    {
      select: ["id", "kind", "amount", "balance_after", "order_id", "note", "created_at"],
      take: null,
      order: { created_at: "ASC" },
    }
  )
  res.json({ gift_card: { ...publicGiftCard(card), transactions } })
}
