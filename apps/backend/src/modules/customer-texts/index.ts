import { Module } from "@medusajs/framework/utils"

import CustomerTextModuleService from "./service"

export const CUSTOMER_TEXTS_MODULE = "customer_texts"

export default Module(CUSTOMER_TEXTS_MODULE, {
  service: CustomerTextModuleService,
})
