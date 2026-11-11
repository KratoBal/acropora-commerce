import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { LIVESTOCK_ARRIVAL_MODULE } from "../../../modules/livestock-arrival"
import type LivestockArrivalModuleService from "../../../modules/livestock-arrival/service"
import { buyableProducts } from "../../../workflows/utils/stock-alert-arrivals"
import { cachedBuyable, storeArrivals, type StoredArrival } from "./helpers"

/** One cache for the process (`cachedBuyable`); the query comes from the request's scope, the same one every time. */
let buyable: ((key: string) => Promise<boolean>) | null = null

/**
 * The live animals on their way, for the storefront's "Érkező állatok" page (V2.6, card f4e4832b). What is here is
 * what the OS published as visible to buyers; whether a species can be bought now is the stock alert's own rule.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<LivestockArrivalModuleService>(LIVESTOCK_ARRIVAL_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const rows = (await service.listLivestockArrivals({}, { take: null })) as unknown as StoredArrival[]
  buyable ??= cachedBuyable(async (key) => (await buyableProducts(query as never, "species", key)).length > 0)
  const livestock_arrivals = await storeArrivals(rows, buyable)
  res.json({ livestock_arrivals })
}
