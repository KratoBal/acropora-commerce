import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { accessibleOrder } from "../../../../workflows/utils/problem-report/report"
import { declareWithdrawal } from "../../../../workflows/utils/withdrawal/declare"
import type { StorePostGuestWithdrawalType } from "./validators"

/**
 * POST /store/guest-orders/withdrawal
 *
 * The withdrawal declaration itself (V0.3: the "Elállás megerősítése" step; the form before it is the page's). The
 * same pair as the guest lookup opens the order (every miss is ONE 404); the items must be that order's lines. The
 * answer (201 with the id and the time of receipt, the 400s, the 409, the acknowledgement after the answer) is
 * `declareWithdrawal`'s, shared with the signed-in customer's route.
 */
export const POST = async (req: MedusaRequest<StorePostGuestWithdrawalType>, res: MedusaResponse) => {
  const body = req.validatedBody
  const order = await accessibleOrder(req.scope, Number(body.order_number.replace(/^#/, "")), body.email)
  if (!order) {
    res.status(404).json({ message: "Nem találtuk a rendelést." })
    return
  }
  await declareWithdrawal(req.scope, res, order, { customerName: body.customer_name, itemIds: body.item_ids })
}
