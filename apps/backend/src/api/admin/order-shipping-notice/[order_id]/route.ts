import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"

import { shippedMailOperations } from "../../../../workflows/utils/webshop-mail/operations"
import { deliverShopMail } from "../../../../workflows/utils/webshop-mail/deliver"
import { prepareShippedMail } from "../../../../workflows/utils/webshop-mail/shipped"
import { AdminOrderShippingNoticeType } from "../validators"

/**
 * POST /admin/order-shipping-notice/:order_id
 *
 * The OS calls this when the parcel exists at the carrier (its order page's
 * "Csomag" step), for the shipped order only. The shop then sends the
 * "Feladtuk a csomagodat" mail (Figma 488:109 / 488:131 / 488:150), if its
 * mail channel is on. Nothing is written on the order. See `shipped.ts`.
 */
export const POST = async (
  req: MedusaRequest<AdminOrderShippingNoticeType>,
  res: MedusaResponse
) => {
  const { order_id } = req.params
  const notice = req.validatedBody
  const result = await prepareShippedMail(order_id, notice, shippedMailOperations(req.scope))

  if (result.status === "not_found") {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${order_id} was not found`)
  }
  if (result.status === "skip") {
    res.json({ sent: false, reason: result.reason })
    return
  }

  const delivery = await deliverShopMail(req.scope, result.mail)
  if (!delivery.sent) {
    // the OS renders the mail later (Levélsablonok outbox); the parcel stands
    res.json({ sent: false, reason: "queued", message: delivery.reason })
    return
  }
  req.scope
    .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    .info(
      `Order ${order_id}: shipping mail sent (${notice.carrier}${notice.parcel_id ? `, OS parcel ${notice.parcel_id}` : ""}).`
    )
  res.json({ sent: true })
}
