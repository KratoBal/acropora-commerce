import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import GmailNotificationService from "./service"

/**
 * The shop's email channel through Gmail. Registered only when switched on and
 * given its keys (`webshop-mail-config.ts`), on the `email` channel.
 */
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [GmailNotificationService],
})
