import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import type { OrderBusinessStatus } from "../../../modules/order-business-status/types"
import { orderMailOperations, statusMailOperations } from "./operations"
import { prepareOrderPlacedMail } from "./prepare"
import { operationsOrSkip, sendShopMail } from "./send"
import { prepareStatusMail, type StatusMailSkip } from "./status-mail"

/**
 * WHAT HAPPENED TO THE CUSTOMER'S MAIL OF ONE STATUS CHANGE, for the OS's
 * answer ("Vevő értesítése", "Értesítő újraküldése"):
 *
 *   sent: true                         the mail went to the provider
 *   sent: false, not_requested         the admin unticked "Vevő értesítése"
 *   sent: false, failed                the provider refused it (the status stands)
 *   sent: false, <StatusMailSkip>      see `prepareStatusMail`
 *   sent: false, pickup_half           a mixed cart's pickup order: its
 *                                      confirmation went with the shipped order
 */
export type StatusNotification =
  | { sent: true }
  | { sent: false; reason: StatusMailSkip | "not_requested" | "failed" | "pickup_half" }

/**
 * Sends the mail of one history row. A failed send never undoes the status
 * change: the change already happened, and the OS shows the mail as failed and
 * offers a resend.
 */
export const notifyStatusChange = async (
  container: MedusaContainer,
  input: { orderId: string; status: OrderBusinessStatus; historyId: string; resendAt?: number }
): Promise<StatusNotification> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  try {
    // Feldolgozásra vár: its mail is the order confirmation; only a resend reaches here
    if (input.status === "pending_processing") {
      if (!operationsOrSkip()) return { sent: false, reason: "mail_off" }
      const result = await prepareOrderPlacedMail(input.orderId, orderMailOperations(container), input.resendAt)
      if (result.action === "skip") {
        const reason = result.reason === "pickup_half" || result.reason === "no_email" ? result.reason : "order_missing"
        return { sent: false, reason }
      }
      await sendShopMail(container.resolve(Modules.NOTIFICATION), result.mail)
      return { sent: true }
    }

    const result = await prepareStatusMail(input, statusMailOperations(container))
    if (result.status === "skip") return { sent: false, reason: result.reason }
    await sendShopMail(container.resolve(Modules.NOTIFICATION), result.mail)
    return { sent: true }
  } catch (error) {
    logger.error(
      `Order ${input.orderId}: the ${input.status} status mail failed: ${error instanceof Error ? error.message : String(error)}`
    )
    return { sent: false, reason: "failed" }
  }
}
