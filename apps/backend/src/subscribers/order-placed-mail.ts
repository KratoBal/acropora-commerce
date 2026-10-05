import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { operationsOrSkip, sendShopMail } from "../workflows/utils/webshop-mail/send"
import { prepareOrderPlacedMail } from "../workflows/utils/webshop-mail/prepare"
import { orderMailOperations } from "../workflows/utils/webshop-mail/operations"

/**
 * The order confirmation (`prepareOrderPlacedMail`), only while the shop's mail
 * is switched on (`webshop-mail-config.ts`). A failure is logged with the
 * order's id, never thrown: the order is placed either way.
 */
export default async function orderPlacedMail({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const orderId = event.data?.id
  if (!orderId || !operationsOrSkip()) return

  try {
    const result = await prepareOrderPlacedMail(orderId, orderMailOperations(container))
    if (result.action === "send") {
      await sendShopMail(container.resolve(Modules.NOTIFICATION), result.mail)
    }
  } catch (error) {
    logger.error(
      `Order ${orderId}: the order confirmation mail was not sent: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
