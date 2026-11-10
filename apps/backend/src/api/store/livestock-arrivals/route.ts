import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { LIVESTOCK_ARRIVAL_MODULE } from "../../../modules/livestock-arrival"
import type LivestockArrivalModuleService from "../../../modules/livestock-arrival/service"
import { buyableProducts } from "../../../workflows/utils/stock-alert-arrivals"
import { storeArrivals, type StoredArrival } from "./helpers"

/**
 * The live animals on their way, for the storefront's "Érkező állatok" page (V2.6, card f4e4832b). What is here is
 * what the OS published as visible to buyers; whether a species can be bought now is the stock alert's own rule.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<LivestockArrivalModuleService>(LIVESTOCK_ARRIVAL_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const rows = (await service.listLivestockArrivals({}, { take: null })) as unknown as StoredArrival[]
  const livestock_arrivals = await storeArrivals(
    rows,
    async (key) => (await buyableProducts(query as never, "species", key)).length > 0
  )
  res.json({ livestock_arrivals })
}
