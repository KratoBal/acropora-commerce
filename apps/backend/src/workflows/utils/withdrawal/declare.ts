import type { MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"

import { guestWithdrawalsOf } from "../guest-order/operations"
import type { AccessibleOrder } from "../problem-report/report"
import { notifyWithdrawalReceived } from "../webshop-mail/withdrawal-received-mail"
import { cleanName } from "./rules"
import { withdrawalLineTitles } from "./titles"
import { createWithdrawal } from "./withdrawal"

/**
 * THE DECLARATION'S ANSWER, ONE FOR EVERY WAY IN (V0.3). The guest route (order number + address) and the signed-in
 * customer's route (the session) differ only in HOW the order is opened; what follows is the same, so it lives here and
 * both routes answer alike: the page reads one contract.
 *
 * The order is already proven to be the caller's. The name is cleaned here (an empty one is a 400), the items must be that
 * order's lines (a 400); a request whose every line is already withdrawn from is a 409 with the reference that stands and
 * the lines; a recorded declaration is a 201 with its id, the time of receipt and the order's list of declarations (left
 * out when it cannot be read; the declaration is recorded either way). A request that is only PARTLY taken records the
 * free lines and names the taken ones in `already_declared_item_ids` of the 201. The durable-medium acknowledgement (OS-rendered, no wording of the shop's own)
 * goes AFTER the answer and is not waited for: a slow OS render or mail provider must not keep the button spinning.
 */
export const declareWithdrawal = async (
  container: MedusaContainer,
  res: MedusaResponse,
  order: AccessibleOrder,
  input: { customerName: string; itemIds: string[] },
): Promise<void> => {
  const customerName = cleanName(input.customerName)
  if (customerName === "") {
    res.status(400).json({ type: "invalid_data", message: "Add meg a nevedet." })
    return
  }
  const result = await createWithdrawal(container, order, { customerName, itemIds: input.itemIds })
  if (result.status === "bad_items") {
    res
      .status(400)
      .json({ type: "invalid_items", message: "Az egyik kiválasztott tétel nem ehhez a rendeléshez tartozik." })
    return
  }
  if (result.status === "duplicate") {
    // every requested line is already withdrawn from: the customer gets the reference that stands and the lines it holds
    // (no new declaration is made)
    res.status(409).json({
      type: "already_declared",
      withdrawal_id: result.id,
      item_ids: result.itemIds,
      message:
        result.itemIds.length === 1
          ? "Erről a tételről már van elállási nyilatkozatod."
          : "Ezekről a tételekről már van elállási nyilatkozatod.",
    })
    return
  }
  const withdrawals = await guestWithdrawalsOf(container, order.id)
  res.status(201).json({
    withdrawal_id: result.id,
    created_at: result.createdAt,
    ...(withdrawals ? { withdrawals } : {}),
    // the requested lines that were already withdrawn from are named (the rest of the request was recorded): a 201 body
    // reaches the page, a 4xx body does not (the storefront SDK drops it), so a partly taken request is answered 201
    ...(result.skipped.length ? { already_declared_item_ids: result.skipped.map((line) => line.itemId) } : {}),
  })
  // It never throws (the function catches and logs); the catch here is only a net for a rejection that would otherwise
  // go unhandled.
  // The titles of the lines go into the mail's facts when the order can be read (`withdrawalLineTitles` never throws:
  // the acknowledgement is a legal one and goes out with or without them).
  void (async () => {
    const itemTitles = await withdrawalLineTitles(container, order.id, result.itemIds)
    await notifyWithdrawalReceived(container, {
      order: { id: order.id, displayId: order.displayId, email: order.email },
      withdrawalId: result.id,
      declaredName: customerName,
      itemIds: result.itemIds,
      ...(itemTitles.length ? { itemTitles } : {}),
      receivedAt: result.createdAt,
    })
  })().catch(() => undefined)
}
