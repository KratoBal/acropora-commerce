import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"

import { declareWithdrawal } from "../../../../../../../workflows/utils/withdrawal/declare"
import { ownOrder } from "../../../../../../../workflows/utils/withdrawal/withdrawal"
import type { StorePostCustomerWithdrawalType } from "./validators"

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
