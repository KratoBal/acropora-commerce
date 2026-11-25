import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { settleManualRefund } from "../../../../../workflows/utils/manual-refund-settle"
import type { AdminPostManualRefundSettleType } from "../../validators"

/**
 * POST /admin/order-manual-refund/:order_id/settle { settled_by, note? }
 *
 * The OS's "Visszatérítve" button (card abf3f8f4): the hand refund of an order closed unsuccessfully after it shipped is done (in the Stripe
 * dashboard, which the shop cannot see); the mark on the order gets who and when, and the notice closes. Answers who and when as stored.
 * 404: no such order. 409: the order has no hand refund to settle, or the shop already shows the money back. Pressing it again answers
 * the FIRST settlement (idempotent: who and when do not change).
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminPostManualRefundSettleType>, res: MedusaResponse) => {
  const result = await settleManualRefund(req.scope, req.params.order_id, req.validatedBody, req.auth_context.actor_id)
  if (result.status === "not_found") {
    res.status(404).json({ message: "Nincs ilyen rendelés." })
    return
  }
  if (result.status === "no_mark") {
    res.status(409).json({ message: "Ennél a rendelésnél nincs kézi visszatérítés, amit rendezni kellene." })
    return
  }
  if (result.status === "nothing_outstanding") {
    res.status(409).json({
      message: "A webshop szerint a rögzített összeg már vissza van térítve: nincs mit kézzel rendezni (a jelzés a webshopban rögzített visszatérítésre magától eltűnik).",
    })
    return
  }
  res.json({ settled_at: result.settled_at, settled_by: result.settled_by, settled_note: result.settled_note, already: result.status === "already" })
}
