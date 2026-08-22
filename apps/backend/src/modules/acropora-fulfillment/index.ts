import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import AcroporaFulfillmentService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [AcroporaFulfillmentService],
})
