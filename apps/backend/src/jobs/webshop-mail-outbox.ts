import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { runWebshopMailOutbox } from "../workflows/utils/webshop-mail/deliver"
import { webshopMailRenderer } from "../workflows/utils/webshop-mail/os-mail-render"

/**
 * THE MAIL OUTBOX, EVERY TWO MINUTES (Levélsablonok): a mail the OS could not
 * render is tried again on its time (2, 4, 8, then 15 minutes), and a mail
 * not sent within an hour, or one that cannot be sent, is reported once.
 * With the switch off nothing goes into the outbox, so there is nothing to do.
 */
export default async function webshopMailOutboxJob(container: MedusaContainer) {
  if (webshopMailRenderer() !== "os") return
  const result = await runWebshopMailOutbox(container)
  if (result.tried || result.reported) {
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .info(`Webshop mail outbox: tried ${result.tried}, sent ${result.sent}, reported ${result.reported}`)
  }
}

export const config = {
  name: "webshop-mail-outbox",
  schedule: "*/2 * * * *",
}
