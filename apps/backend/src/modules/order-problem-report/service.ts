import { MedusaService } from "@medusajs/framework/utils"

import OrderProblemImage from "./models/order-problem-image"
import OrderProblemReport from "./models/order-problem-report"

class OrderProblemReportModuleService extends MedusaService({ OrderProblemReport, OrderProblemImage }) {}

export default OrderProblemReportModuleService
