import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../../modules/order-business-status"
import OrderBusinessStatusModuleService from "../../../../modules/order-business-status/service"
import { transitionOrderBusinessStatusWorkflow } from "../../../../workflows/transition-order-business-status"
import { notifyStatusChange, type StatusNotification } from "../../../../workflows/utils/webshop-mail/status-notify"
import { AdminTransitionOrderBusinessStatusType } from "../validators"
import { adminStatusDetail } from "../admin-business-status"

/** The order's business status, its history and the admin's next steps (the OS reads it). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { order_id } = req.params
  const business_status = await adminStatusDetail(req.scope, order_id)
  if (!business_status)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No business status exists for order ${order_id}`,
    )
  res.json({ business_status })
}

/**
 * The current backend has one authenticated administrative boundary but no
 * finer application role model. It records this manual operation as `admin`;
 * future carrier callbacks use the same workflow with actor `carrier`.
 *
 * THE CUSTOMER'S MAIL GOES AFTER THE CHANGE, NOT INSIDE IT: a mail that could
 * not go does not undo a status the shop already acted on. `notification`
 * says what happened to it (see `notifyStatusChange`).
 */
export const POST = async (
  req: MedusaRequest<AdminTransitionOrderBusinessStatusType>,
  res: MedusaResponse,
) => {
  const { order_id } = req.params
  const { status, notify_customer } = req.validatedBody

  const { result: business_status } = await transitionOrderBusinessStatusWorkflow(
    req.scope,
  ).run({
    input: {
      order_id,
      to: status,
      actor: "admin",
      source: "admin",
    },
  })

  let notification: StatusNotification = { sent: false, reason: "not_requested" }
  if (notify_customer !== false) {
    const { history } = await req.scope
      .resolve<OrderBusinessStatusModuleService>(ORDER_BUSINESS_STATUS_MODULE)
      .retrieveOrderBusinessStatusForOrder(order_id)
    const row = history.at(-1)
    notification = row
      ? await notifyStatusChange(req.scope, { orderId: order_id, status, historyId: row.id })
      : { sent: false, reason: "order_missing" }
  }

  res.json({ business_status, notification })
}
