import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { operationsOrSkip, sendShopMail } from "../workflows/utils/webshop-mail/send"
import { prepareRefundMail } from "../workflows/utils/webshop-mail/prepare"
import { refundMailOperations } from "../workflows/utils/webshop-mail/operations"

/**
 * The refund notice (`prepareRefundMail`), card payments only, only while the
 * shop's mail is switched on. `payment.refunded` is emitted by Medusa's
 * `refundPaymentWorkflow` (core-flows 2.20.1), the path every refund of ours
 * takes, the one before an order cancel included. A failure is logged, not
 * thrown: the money is refunded either way.
 */
export default async function paymentRefundedMail({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const paymentId = event.data?.id
  if (!paymentId || !operationsOrSkip()) return

  try {
    const result = await prepareRefundMail(paymentId, refundMailOperations(container))
    if (result.action === "send") {
      await sendShopMail(container.resolve(Modules.NOTIFICATION), result.mail)
    }
  } catch (error) {
    logger.error(
      `Payment ${paymentId}: the refund mail was not sent: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "payment.refunded",
}
