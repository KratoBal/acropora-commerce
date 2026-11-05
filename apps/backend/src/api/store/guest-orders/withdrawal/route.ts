import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { accessibleOrder } from "../../../../workflows/utils/problem-report/report"
import { cleanName } from "../../../../workflows/utils/withdrawal/rules"
import { createWithdrawal } from "../../../../workflows/utils/withdrawal/withdrawal"
import type { StorePostGuestWithdrawalType } from "./validators"

/**
 * POST /store/guest-orders/withdrawal
 *
 * The withdrawal declaration itself (V0.3: the "Elállás megerősítése" step; the form before it is the page's). The
 * same pair as the guest lookup opens the order (every miss is ONE 404); the items must be that order's lines. Answers
 * 201 with the declaration's id and the time of receipt (the shop's server time): the customer's reference. The
 * durable-medium acknowledgement (the mail) is the next slice; nothing is promised in words here.
 */
export const POST = async (req: MedusaRequest<StorePostGuestWithdrawalType>, res: MedusaResponse) => {
  const body = req.validatedBody
  const order = await accessibleOrder(req.scope, Number(body.order_number.replace(/^#/, "")), body.email)
  if (!order) {
    res.status(404).json({ message: "Nem találtuk a rendelést." })
    return
  }
  const customerName = cleanName(body.customer_name)
  if (customerName === "") {
    res.status(400).json({ type: "invalid_data", message: "Add meg a nevedet." })
    return
  }
  const result = await createWithdrawal(req.scope, order, { customerName, itemIds: body.item_ids })
  if (result.status === "bad_items") {
    res
      .status(400)
      .json({ type: "invalid_items", message: "Az egyik kiválasztott tétel nem ehhez a rendeléshez tartozik." })
    return
  }
  if (result.status === "duplicate") {
    // the same line is already withdrawn from: the customer gets the reference that stands (no new declaration is made)
    res.status(409).json({
      type: "already_declared",
      withdrawal_id: result.id,
      message: "Erről a tételről már van elállási nyilatkozatod.",
    })
    return
  }
  res.status(201).json({ withdrawal_id: result.id, created_at: result.createdAt })
}
