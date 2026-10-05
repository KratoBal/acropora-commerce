import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../../../modules/order-business-status"
import OrderBusinessStatusModuleService from "../../../../../modules/order-business-status/service"
import type { OrderBusinessStatus } from "../../../../../modules/order-business-status/types"
import { notifyStatusChange } from "../../../../../workflows/utils/webshop-mail/status-notify"
import { AdminResendOrderStatusNotificationType } from "../../validators"

/**
 * POST /admin/order-business-status/:order_id/resend-notification
 *
 * The OS's "Értesítő újraküldése" (Rendelések prompt, point 10): the mail of
 * one history row again, under a new key, so it goes even after a success.
 * Feldolgozásra vár resends the order confirmation. A Kiszállítás row resends
 * the status mail, not the "Feladtuk" mail (that one needs the tracking
 * number, which the OS holds and sends with the shipping notice).
 */
export const POST = async (
  req: MedusaRequest<AdminResendOrderStatusNotificationType>,
  res: MedusaResponse,
) => {
  const { order_id } = req.params
  const { history_id } = req.validatedBody

  const service = req.scope.resolve<OrderBusinessStatusModuleService>(ORDER_BUSINESS_STATUS_MODULE)
  const { history } = await service.retrieveOrderBusinessStatusForOrder(order_id)
  const row = history_id ? history.find((entry) => entry.id === history_id) : history.at(-1)
  if (!row)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No status history row ${history_id ?? "(latest)"} for order ${order_id}`,
    )

  const notification = await notifyStatusChange(req.scope, {
    orderId: order_id,
    status: row.to_status as OrderBusinessStatus,
    historyId: row.id,
    resendAt: Date.now(),
  })
  res.json({ notification })
}
