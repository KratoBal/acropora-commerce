import { Module } from "@medusajs/framework/utils"

import OrderProblemReportModuleService from "./service"

export const ORDER_PROBLEM_REPORT_MODULE = "order_problem_report"

export default Module(ORDER_PROBLEM_REPORT_MODULE, {
  service: OrderProblemReportModuleService,
})
