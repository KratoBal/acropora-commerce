import { Module } from "@medusajs/framework/utils"

import connection from "./loaders/connection"
import RateLimitModuleService from "./service"

export const RATE_LIMIT_MODULE = "rate_limit"

export default Module(RATE_LIMIT_MODULE, {
  service: RateLimitModuleService,
  loaders: [connection],
})
