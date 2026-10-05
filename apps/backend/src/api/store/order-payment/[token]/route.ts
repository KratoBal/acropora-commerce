import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { requirePaymentLinkConfig } from "../../../../workflows/utils/order-payment/link-config"
import { payByLinkOperations } from "../../../../workflows/utils/order-payment/operations"
import { resolvePaymentLink } from "../../../../workflows/utils/order-payment/pay-by-link"
import { orderMailOperations } from "../../../../workflows/utils/webshop-mail/operations"

/**
 * THE PAYMENT PAGE'S SUMMARY ("Rendelés fizetése", plan 2.2): the orders'
 * lines and the amount, and whether the link still pays. A link that expired,
 * was paid or was replaced answers so (200), not 404: the page tells the
 * customer what to do. Only a token this server did not sign is a 404.
 *
 * The token comes from the customer's mail; the answer carries the lines and
 * amounts that mail already showed, and no address or e-mail.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { secret } = requirePaymentLinkConfig()
  const resolved = await resolvePaymentLink(req.params.token, payByLinkOperations(req.scope), secret)
  if (!resolved) throw new MedusaError(MedusaError.Types.NOT_FOUND, "A fizetési link nem található.")

  const loadOrder = orderMailOperations(req.scope).loadOrder
  const sides = [resolved.pair.primary, ...(resolved.pair.pickup ? [resolved.pair.pickup] : [])]
  const orders: { display_id: number | string; items: unknown[]; shipping: unknown[]; total: number }[] = []
  for (const side of sides) {
    const order = await loadOrder(side.order_id)
    if (!order) continue
    orders.push({
      display_id: order.display_id,
      items: order.items,
      shipping: order.shipping,
      total: order.total,
    })
  }

  res.json({
    state: resolved.state,
    amount: resolved.payload.amount,
    currency_code: "huf",
    expires_at: new Date(resolved.payload.expires_at).toISOString(),
    paid_at: resolved.state === "paid" ? resolved.stored?.paid_at ?? null : null,
    orders,
  })
}
