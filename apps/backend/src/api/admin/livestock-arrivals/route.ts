import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { LIVESTOCK_ARRIVAL_MODULE } from "../../../modules/livestock-arrival"
import type LivestockArrivalModuleService from "../../../modules/livestock-arrival/service"
import { AdminPutLivestockArrivalsType } from "./validators"

/**
 * THE LIVE ANIMALS ON THEIR WAY (V2.6, card f4e4832b, S4a). The Acropora OS is the owner and the only writer: it sends
 * the whole set a buyer may see, and what it no longer sends leaves (`replaceAll`). The storefront reads it through
 * `GET /store/livestock-arrivals`.
 */
/** What is stored now, for the OS to compare before it writes (it sends only on a difference, as the redirects). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve<LivestockArrivalModuleService>(LIVESTOCK_ARRIVAL_MODULE)
  const rows = (await service.listLivestockArrivals({}, { take: null })) as unknown as {
    os_id: string
    kind: string
    label: string
    expected_on: string
    status: string
    medusa_product_id: string | null
  }[]
  const livestock_arrivals = rows
    .map(({ os_id, kind, label, expected_on, status, medusa_product_id }) => ({
      os_id,
      kind,
      label,
      expected_on,
      status,
      medusa_product_id,
    }))
    .sort((a, b) => a.os_id.localeCompare(b.os_id))
  res.json({ livestock_arrivals })
}

export const PUT = async (req: MedusaRequest<AdminPutLivestockArrivalsType>, res: MedusaResponse) => {
  const service = req.scope.resolve<LivestockArrivalModuleService>(LIVESTOCK_ARRIVAL_MODULE)
  const result = await service.replaceAll(req.validatedBody.arrivals)
  res.json({ livestock_arrivals: result })
}
