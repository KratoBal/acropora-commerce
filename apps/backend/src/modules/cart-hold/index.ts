import { Module } from "@medusajs/framework/utils"

import CartHoldModuleService from "./service"

export const CART_HOLD_MODULE = "cart_hold"

export default Module(CART_HOLD_MODULE, {
  service: CartHoldModuleService,
})
