import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SPLIT_BLOCK_MESSAGE } from "../../../../workflows/utils/order-split/plan"
import { splitOperations } from "../../../../workflows/utils/order-split/operations"
import { splitOrder } from "../../../../workflows/utils/order-split/split"
import type { AdminPostOrderSplitType } from "../validators"

const BLOCKED_PAYMENT_MESSAGE = {
  card_not_held:
    "A kártyás rendelés most nem bontható szét: a zárolása már nem áll (feloldották vagy levonták). Előbb rendezd a fizetését.",
  unknown_payment: "A rendelés fizetési módja nem ismert, ezért nem bontható szét.",
} as const

/**
 * POST /admin/order-split/:order_id  { lines: [{item_id, quantity}], request_id, actor? }
 *
 * The selected lines move to a new, linked order (card 0a14f739, C/3;
 * `workflows/utils/order-split/split.ts`). 200: the new order (`order_id`,
 * `display_id`), both totals and the new order's payment state; 404 / 409 /
 * 422 with a Hungarian message.
 */
export const POST = async (req: AuthenticatedMedusaRequest<AdminPostOrderSplitType>, res: MedusaResponse) => {
  const result = await splitOrder(req.params.order_id, req.validatedBody, req.auth_context.actor_id, splitOperations(req.scope))
  switch (result.status) {
    case "not_found":
      res.status(404).json({ message: "Nincs ilyen rendelés." })
      return
    case "blocked":
      res.status(409).json({
        message:
          result.reason === "card_not_held" || result.reason === "unknown_payment"
            ? BLOCKED_PAYMENT_MESSAGE[result.reason]
            : SPLIT_BLOCK_MESSAGE[result.reason],
      })
      return
    case "invalid":
      res.status(422).json({ message: result.message })
      return
    case "done": {
      const { status: _status, ...body } = result
      res.json(body)
    }
  }
}
