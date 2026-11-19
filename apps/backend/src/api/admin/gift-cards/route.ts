import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { GIFT_CARD_FIELDS, GIFT_CARD_LIST_LIMIT, publicGiftCard, resolveGiftCards } from "./helpers"
import type { AdminIssueGiftCardType } from "./validators"

/** The gift cards, newest first (card 495c0007). The code's hash never leaves the shop. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const [cards, count] = await resolveGiftCards(req.scope).listAndCountGiftCards(
    {},
    { select: [...GIFT_CARD_FIELDS], take: GIFT_CARD_LIST_LIMIT, order: { created_at: "DESC" } }
  )
  res.json({ gift_cards: cards.map(publicGiftCard), count, truncated: count > cards.length })
}

/** Issues a card. The answer carries its full code: this is the only time it is shown. */
export const POST = async (req: MedusaRequest<AdminIssueGiftCardType>, res: MedusaResponse) => {
  const body = req.validatedBody
  const { gift_card, code } = await resolveGiftCards(req.scope).issueGiftCard({
    amount: body.amount,
    expires_at: body.expires_at ?? null,
    recipient_email: body.recipient_email ?? null,
    note: body.note ?? null,
    issued_by: (req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context?.actor_id ?? null,
  })
  res.status(201).json({ gift_card: publicGiftCard(gift_card), code })
}
