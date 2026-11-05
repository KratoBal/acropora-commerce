import { MedusaService } from "@medusajs/framework/utils"

import OrderWithdrawal from "./models/order-withdrawal"
import OrderWithdrawalItem from "./models/order-withdrawal-item"

class OrderWithdrawalModuleService extends MedusaService({ OrderWithdrawal, OrderWithdrawalItem }) {}

export default OrderWithdrawalModuleService
