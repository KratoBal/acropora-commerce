import { Module } from "@medusajs/framework/utils"

import CommerceSettingsModuleService from "./service"

export const COMMERCE_SETTINGS_MODULE = "commerce_settings"

export default Module(COMMERCE_SETTINGS_MODULE, {
  service: CommerceSettingsModuleService,
})
