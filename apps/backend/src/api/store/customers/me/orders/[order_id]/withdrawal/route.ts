import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"

import { declareWithdrawal } from "../../../../../../../workflows/utils/withdrawal/declare"
import { guestWithdrawalsOf } from "../../../../../../../workflows/utils/guest-order/operations"
import { ownOrder, storePickupOf } from "../../../../../../../workflows/utils/withdrawal/withdrawal"
import type { StorePostCustomerWithdrawalType } from "./validators"

/**
 * GET /store/customers/me/orders/:order_id/withdrawal
 *
 * What the order page needs to draw the withdrawal block for the signed-in customer: whether the order is collected in
 * the store (`store_pickup`: the live animals' order, where the owner has not yet said whether the right applies, so
 * the page must not offer the button) and the declarations already made (`withdrawals`, left out when they cannot be
 * read: the page then keeps what it has). The same opening as the POST: the session's customer id, never the request's;
 * another customer's order and a missing one are the same 404.
 */
export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Jelentkezz be a rendelés megtekintéséhez." })
    return
  }
  const order = await ownOrder(req.scope, customerId, req.params.order_id ?? "")
  if (!order) {
    res.status(404).json({ message: "Nem találtuk a rendelést." })
    return
  }
  const [storePickup, withdrawals] = await Promise.all([
    storePickupOf(req.scope, order.id),
    guestWithdrawalsOf(req.scope, order.id),
  ])
  res.json({ store_pickup: storePickup, ...(withdrawals ? { withdrawals } : {}) })
}

/**
 * POST /store/customers/me/orders/:order_id/withdrawal
 *
 * The signed-in customer's withdrawal declaration (V0.3). The same declaration as the guest route, opened by the
 * session instead of the number and address pair: the order must be the session customer's own (the customer id comes
 * from the session, never from the request), and another customer's order or one that does not exist is the same 404, so
 * the route cannot probe which order ids are real. The answer is `declareWithdrawal`'s, shared with the guest route.
 * The stock `/store/customers/me*` middleware requires the session (401 without it); the route checks it again.
 */
export const POST = async (req: MedusaStoreRequest<StorePostCustomerWithdrawalType>, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Jelentkezz be az elállási nyilatkozathoz." })
    return
  }
  const order = await ownOrder(req.scope, customerId, req.params.order_id ?? "")
  if (!order) {
    res.status(404).json({ message: "Nem találtuk a rendelést." })
    return
  }
  const body = req.validatedBody
  await declareWithdrawal(req.scope, res, order, { customerName: body.customer_name, itemIds: body.item_ids })
}
