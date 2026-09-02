import { Module } from "@medusajs/framework/utils"

import OrderBusinessStatusModuleService from "./service"

export const ORDER_BUSINESS_STATUS_MODULE = "order_business_status"

export default Module(ORDER_BUSINESS_STATUS_MODULE, {
  service: OrderBusinessStatusModuleService,
})
