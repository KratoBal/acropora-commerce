import { Module } from "@medusajs/framework/utils"

import LivestockArrivalModuleService from "./service"

export const LIVESTOCK_ARRIVAL_MODULE = "livestock_arrival"

export default Module(LIVESTOCK_ARRIVAL_MODULE, {
  service: LivestockArrivalModuleService,
})
