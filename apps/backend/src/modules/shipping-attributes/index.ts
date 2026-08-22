import { Module } from "@medusajs/framework/utils"

import ShippingAttributesModuleService from "./service"

export const SHIPPING_ATTRIBUTES_MODULE = "shipping_attributes"

export default Module(SHIPPING_ATTRIBUTES_MODULE, {
  service: ShippingAttributesModuleService,
})
