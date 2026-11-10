import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { LIVESTOCK_ARRIVAL_MODULE } from "../../../modules/livestock-arrival"
import type LivestockArrivalModuleService from "../../../modules/livestock-arrival/service"
import { AdminPutLivestockArrivalsType } from "./validators"

/**
 * THE LIVE ANIMALS ON THEIR WAY (V2.6, card f4e4832b, S4a). The Acropora OS is the owner and the only writer: it sends
 * the whole set a buyer may see, and what it no longer sends leaves (`replaceAll`). The storefront reads it through
 * `GET /store/livestock-arrivals`.
 */
export const PUT = async (req: MedusaRequest<AdminPutLivestockArrivalsType>, res: MedusaResponse) => {
  const service = req.scope.resolve<LivestockArrivalModuleService>(LIVESTOCK_ARRIVAL_MODULE)
  const result = await service.replaceAll(req.validatedBody.arrivals)
  res.json({ livestock_arrivals: result })
}
