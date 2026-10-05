import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { loadOrderPaymentSide } from "../../../../workflows/utils/order-payment/operations"
import { orderPaymentView } from "../../../../workflows/utils/order-payment/state"

/**
 * The order's payment state for the OS's order page (the lejáró zárolás plan,
 * 2.1): `{ state, hold, link, paid_at }`. The OS shows "a zárolás 2 nap múlva
 * lejár" from `hold.expires_at`, and offers "Csúszik a szállítás" while the
 * state is `hold`.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { order_id } = req.params
  const order = await loadOrderPaymentSide(req.scope, order_id)
  if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${order_id} was not found`)
  res.json(orderPaymentView(order))
}
