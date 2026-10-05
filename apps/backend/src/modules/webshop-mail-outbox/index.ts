import { Module } from "@medusajs/framework/utils"

import WebshopMailOutboxModuleService from "./service"

export const WEBSHOP_MAIL_OUTBOX_MODULE = "webshop_mail_outbox"

export default Module(WEBSHOP_MAIL_OUTBOX_MODULE, {
  service: WebshopMailOutboxModuleService,
})
