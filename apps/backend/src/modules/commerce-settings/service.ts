import { MedusaService } from "@medusajs/framework/utils"

import CommerceSetting from "./models/commerce-setting"

class CommerceSettingsModuleService extends MedusaService({
  CommerceSetting,
}) {}

export default CommerceSettingsModuleService
