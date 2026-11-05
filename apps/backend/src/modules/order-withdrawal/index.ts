import { Module } from "@medusajs/framework/utils"

import OrderWithdrawalModuleService from "./service"

export const ORDER_WITHDRAWAL_MODULE = "order_withdrawal"

export default Module(ORDER_WITHDRAWAL_MODULE, {
  service: OrderWithdrawalModuleService,
})
