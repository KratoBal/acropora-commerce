import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { orderMailOperations, paymentDelayedMailOperations, paymentLinkMailOperations } from "./operations"
import { type PaymentDelayedInput, type PaymentDelayedSkip, preparePaymentDelayedMail } from "./payment-delayed-mail"
import { type PaymentLinkMailSkip, preparePaymentLinkMail } from "./payment-link-mail"
import { sendShopMail } from "./send"

/**
 * WHAT HAPPENED TO THE CUSTOMER'S MAIL OF A PAYMENT STEP, in the same shape as
 * a status change's (`StatusNotification`), so the OS reads both alike:
 *
 *   sent: true                     the mail went to the provider
 *   sent: false, not_requested     the admin unticked "Vevő értesítése"
 *   sent: false, failed            the provider refused it (the step stands)
 *   sent: false, <skip>            see `preparePaymentDelayedMail`
 */
export type PaymentNotification =
  | { sent: true }
  | { sent: false; reason: PaymentDelayedSkip | PaymentLinkMailSkip | "not_requested" | "failed" }

const failed = (container: MedusaContainer, orderId: string, mail: string, error: unknown): PaymentNotification => {
  container
    .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    .error(`Order ${orderId}: the ${mail} mail failed: ${error instanceof Error ? error.message : String(error)}`)
  return { sent: false, reason: "failed" }
}

/** The "csúszik" mail. A failed send never undoes the release: the hold is gone either way. */
export const notifyHoldReleased = async (
  container: MedusaContainer,
  input: PaymentDelayedInput
): Promise<PaymentNotification> => {
  try {
    const result = await preparePaymentDelayedMail(input, paymentDelayedMailOperations(container))
    if (result.status === "skip") return { sent: false, reason: result.reason }
    await sendShopMail(container.resolve(Modules.NOTIFICATION), result.mail)
    return { sent: true }
  } catch (error) {
    return failed(container, input.orderId, "payment-delayed", error)
  }
}

/**
 * The payment link's mail, from the shipped order; a mixed cart's pickup order
 * is listed in it. A failed send does not take the link back: the OS shows the
 * mail as failed, and sending the link again sends a new mail.
 */
export const notifyPaymentLink = async (
  container: MedusaContainer,
  input: { orderId: string; pickupOrderId: string | null; sentAt: string; url: string; expiresAt: string; amount: number }
): Promise<PaymentNotification> => {
  try {
    const pickup = input.pickupOrderId ? await orderMailOperations(container).loadOrder(input.pickupOrderId) : null
    const result = await preparePaymentLinkMail(
      { orderId: input.orderId, sentAt: input.sentAt, url: input.url, expiresAt: input.expiresAt, amount: input.amount, pickup },
      paymentLinkMailOperations(container)
    )
    if (result.status === "skip") return { sent: false, reason: result.reason }
    await sendShopMail(container.resolve(Modules.NOTIFICATION), result.mail)
    return { sent: true }
  } catch (error) {
    return failed(container, input.orderId, "payment-link", error)
  }
}
