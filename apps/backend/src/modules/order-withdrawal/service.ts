import { MedusaService } from "@medusajs/framework/utils"

import OrderWithdrawal from "./models/order-withdrawal"

class OrderWithdrawalModuleService extends MedusaService({ OrderWithdrawal }) {}

export default OrderWithdrawalModuleService
