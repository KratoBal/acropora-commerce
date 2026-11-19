import { Module } from "@medusajs/framework/utils"

import install from "./loaders/install"
import WholeCurrencyPromotionsModuleService from "./service"

export const WHOLE_CURRENCY_PROMOTIONS_MODULE = "whole_currency_promotions"

export default Module(WHOLE_CURRENCY_PROMOTIONS_MODULE, {
  service: WholeCurrencyPromotionsModuleService,
  loaders: [install],
})
