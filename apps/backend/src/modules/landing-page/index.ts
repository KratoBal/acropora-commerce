import { Module } from "@medusajs/framework/utils"

import LandingPageModuleService from "./service"

export const LANDING_PAGE_MODULE = "landing_page"

export default Module(LANDING_PAGE_MODULE, {
  service: LandingPageModuleService,
})
