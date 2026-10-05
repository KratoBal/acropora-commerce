import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { paymentDelayedMailOperations } from "./operations"
import { type PaymentDelayedInput, type PaymentDelayedSkip, preparePaymentDelayedMail } from "./payment-delayed-mail"
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
  | { sent: false; reason: PaymentDelayedSkip | "not_requested" | "failed" }

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
    container
      .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
      .error(
        `Order ${input.orderId}: the payment-delayed mail failed: ${error instanceof Error ? error.message : String(error)}`
      )
    return { sent: false, reason: "failed" }
  }
}
